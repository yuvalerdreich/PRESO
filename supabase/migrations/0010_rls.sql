-- RLS enable + every policy (TECHNICAL_DESIGN.md §3.14). The second enforcement layer next
-- to route/action-level checks (ARCHITECTURE.md §3.3) — a route-handler bug can't leak
-- cross-tenant data because the database itself blocks it.
--
-- auth.uid() is the caller; is_admin() / is_owner_of() / is_employee_of() are the
-- security-definer helpers §3.14's preamble names. They run as SECURITY DEFINER
-- specifically so a policy on `businesses` (say) can safely query `employees` — itself
-- RLS-protected — without the two tables' policies recursing into each other.

-- ============================================================================
-- Helper functions
-- ============================================================================

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and account_type = 'ADMIN');
$$;

create or replace function is_owner_of(p_business_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from businesses where id = p_business_id and owner_profile_id = auth.uid()
  );
$$;

create or replace function is_employee_of(p_business_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from employees
     where business_id = p_business_id and profile_id = auth.uid() and status = 'ACTIVE'
  );
$$;

-- ============================================================================
-- Column-immutability triggers. RLS is row-level, not column-level — "own row, but not
-- account_type/status" (profiles) and "own row, read_at only" (notifications) each need a
-- BEFORE UPDATE trigger alongside their RLS UPDATE policy. Both let admin (profiles) or
-- service_role (notifications — the emailed_at webhook, ARCHITECTURE.md §1's admin.ts
-- boundary) through untouched; BYPASSRLS skips policies but never skips triggers.
-- ============================================================================

create or replace function protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- auth.role() is NULL/absent outside a PostgREST-mediated request (direct SQL access —
  -- e.g. provisioning the first-ever ADMIN, §5: "provisioned internally only", never
  -- through the app). Only the 'authenticated' self-service path is restricted here.
  --
  -- §12.34's claim_business_account_type() (0012) is the one sanctioned self-service
  -- exception: a CLIENT voluntarily becoming BUSINESS post-OAuth-signup, since Google
  -- sign-in has no way to pass that choice before the profile row exists. security
  -- definer bypasses RLS but never bypasses triggers, so that RPC sets this
  -- transaction-local flag immediately before its UPDATE — the same technique 0009 already
  -- uses to dedupe reschedule notifications — rather than this trigger ever trusting
  -- account_type from the client directly.
  if is_admin() or coalesce(auth.role(), '') <> 'authenticated'
     or coalesce(current_setting('app.claim_business_account_type', true), '') = 'true' then
    return new;
  end if;
  if new.account_type is distinct from old.account_type
     or new.status is distinct from old.status then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on profiles
  for each row execute function protect_profile_privileged_columns();

create or replace function protect_notification_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- same reasoning as protect_profile_privileged_columns(): only the 'authenticated'
  -- self-service path is restricted — service_role (the webhook) and direct SQL access
  -- both pass through untouched.
  if is_admin() or coalesce(auth.role(), '') <> 'authenticated' then
    return new;
  end if;
  if new.type is distinct from old.type
     or new.payload is distinct from old.payload
     or new.profile_id is distinct from old.profile_id
     or new.emailed_at is distinct from old.emailed_at
     or new.created_at is distinct from old.created_at then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger notifications_protect_columns
  before update on notifications
  for each row execute function protect_notification_columns();

-- ============================================================================
-- profiles — own row; admin all. Write: own row (account_type/status protected above).
-- ============================================================================

alter table profiles enable row level security;

create policy profiles_select on profiles for select
  using (id = auth.uid() or is_admin());

create policy profiles_update on profiles for update
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- no INSERT/DELETE policy: rows are created by handle_new_user() (security definer,
-- 0009_triggers.sql) and deleted only by auth.users cascading — neither needs RLS to pass.

-- ============================================================================
-- categories — public read; admin-only write. DELETE-while-referenced is already blocked
-- by businesses.category_id's `on delete restrict` (§3.3), not RLS's job.
-- ============================================================================

alter table categories enable row level security;

create policy categories_select on categories for select using (true);
create policy categories_insert on categories for insert with check (is_admin());
create policy categories_update on categories for update using (is_admin()) with check (is_admin());
create policy categories_delete on categories for delete using (is_admin());

-- ============================================================================
-- businesses — public where ACTIVE; owner/staff/admin always. Write: any ACTIVE employee
-- of the business (owner or staff) — decided §12.1. INSERT: the caller names themselves
-- owner of a brand-new row (is_owner_of(id) can't apply yet — the row doesn't exist until
-- this INSERT succeeds), gated to BUSINESS-type accounts.
-- ============================================================================

alter table businesses enable row level security;

create policy businesses_select on businesses for select
  using (status = 'ACTIVE' or is_owner_of(id) or is_employee_of(id) or is_admin());

create policy businesses_insert on businesses for insert
  with check (
    owner_profile_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and account_type = 'BUSINESS')
  );

create policy businesses_update on businesses for update
  using (is_owner_of(id) or is_employee_of(id))
  with check (is_owner_of(id) or is_employee_of(id));

-- no DELETE policy — §4.1: "not offered", suspension replaces deletion.

-- ============================================================================
-- business_hours — public read; same write axis as businesses (§12.1).
-- ============================================================================

alter table business_hours enable row level security;

create policy business_hours_select on business_hours for select using (true);

create policy business_hours_insert on business_hours for insert
  with check (is_owner_of(business_id) or is_employee_of(business_id));

create policy business_hours_update on business_hours for update
  using (is_owner_of(business_id) or is_employee_of(business_id))
  with check (is_owner_of(business_id) or is_employee_of(business_id));

create policy business_hours_delete on business_hours for delete
  using (is_owner_of(business_id) or is_employee_of(business_id));

-- ============================================================================
-- employees — a *position*, public read. Write: insert/delete by the business owner only
-- (§4.2); status by the owner. This is deliberately NOT the broadened §12.1 axis — roster
-- management stays the founder's alone, per PDF §3.1's one stated exception.
-- ============================================================================

alter table employees enable row level security;

create policy employees_select on employees for select using (true);

create policy employees_insert on employees for insert
  with check (is_owner_of(business_id));

create policy employees_update on employees for update
  using (is_owner_of(business_id))
  with check (is_owner_of(business_id));

create policy employees_delete on employees for delete
  using (is_owner_of(business_id));

-- ============================================================================
-- employee_availability_rules — public read; write by the OWNING employee only. Unlike
-- businesses/business_hours, this was never part of the §12.1 conflict — ARCHITECTURE.md's
-- matrix keeps "edit another employee's services/availability" ❌ for owner and employee
-- alike, and §12.1's decision didn't touch it.
-- ============================================================================

alter table employee_availability_rules enable row level security;

create policy availability_rules_select on employee_availability_rules for select using (true);

create policy availability_rules_insert on employee_availability_rules for insert
  with check (exists (
    select 1 from employees e where e.id = employee_id and e.profile_id = auth.uid()
  ));

create policy availability_rules_update on employee_availability_rules for update
  using (exists (select 1 from employees e where e.id = employee_id and e.profile_id = auth.uid()))
  with check (exists (select 1 from employees e where e.id = employee_id and e.profile_id = auth.uid()));

create policy availability_rules_delete on employee_availability_rules for delete
  using (exists (select 1 from employees e where e.id = employee_id and e.profile_id = auth.uid()));

-- ============================================================================
-- services — public read; write by the OWNING employee only (same axis as above).
-- ============================================================================

alter table services enable row level security;

create policy services_select on services for select using (true);

create policy services_insert on services for insert
  with check (exists (
    select 1 from employees e where e.id = employee_id and e.profile_id = auth.uid()
  ));

create policy services_update on services for update
  using (exists (select 1 from employees e where e.id = employee_id and e.profile_id = auth.uid()))
  with check (exists (select 1 from employees e where e.id = employee_id and e.profile_id = auth.uid()));

create policy services_delete on services for delete
  using (exists (select 1 from employees e where e.id = employee_id and e.profile_id = auth.uid()));

-- ============================================================================
-- appointments — read by the booking client, the assigned employee, the business owner,
-- or admin. NO write policies at all: every write goes through the five security-definer
-- RPCs (0007_fn_booking.sql), which run as the table owner and so bypass RLS entirely —
-- regular roles get nothing (§4.4: "no direct write — RPC only").
-- ============================================================================

alter table appointments enable row level security;

create policy appointments_select on appointments for select
  using (
    client_profile_id = auth.uid()
    or exists (select 1 from employees e where e.id = employee_id and e.profile_id = auth.uid())
    or is_owner_of((select business_id from employees where id = employee_id))
    or is_admin()
  );

-- ============================================================================
-- join_requests — read by the applicant + business staff (+ admin); insert by the
-- applicant; status decided by the business OWNER only (§6.8 rule 6 — the one thing that
-- stays owner-exclusive even after §12.1's broadening).
-- ============================================================================

alter table join_requests enable row level security;

create policy join_requests_select on join_requests for select
  using (
    profile_id = auth.uid()
    or is_owner_of(business_id) or is_employee_of(business_id)
    or is_admin()
  );

create policy join_requests_insert on join_requests for insert
  with check (profile_id = auth.uid());

create policy join_requests_update on join_requests for update
  using (is_owner_of(business_id))
  with check (is_owner_of(business_id));

-- ============================================================================
-- waitlist_entries — own row; business reads its own; admin all. Write: INSERT/DELETE are
-- "own row" client self-service (join / leave); NO client-facing UPDATE — status changes
-- are matcher-, cron-, or claim_waitlist_entry()-driven only (all security definer,
-- 0008_fn_waitlist.sql), mirroring appointments' "RPC only" rule.
-- ============================================================================

alter table waitlist_entries enable row level security;

create policy waitlist_entries_select on waitlist_entries for select
  using (
    client_profile_id = auth.uid()
    or is_owner_of(business_id) or is_employee_of(business_id)
    or is_admin()
  );

create policy waitlist_entries_insert on waitlist_entries for insert
  with check (client_profile_id = auth.uid());

create policy waitlist_entries_delete on waitlist_entries for delete
  using (client_profile_id = auth.uid());

-- ============================================================================
-- waitlist_employee_targets — follows the parent entry, for both read and write.
-- ============================================================================

alter table waitlist_employee_targets enable row level security;

create policy waitlist_targets_select on waitlist_employee_targets for select
  using (exists (
    select 1 from waitlist_entries we
     where we.id = waitlist_entry_id
       and (we.client_profile_id = auth.uid()
            or is_owner_of(we.business_id) or is_employee_of(we.business_id)
            or is_admin())
  ));

create policy waitlist_targets_insert on waitlist_employee_targets for insert
  with check (exists (
    select 1 from waitlist_entries we
     where we.id = waitlist_entry_id and we.client_profile_id = auth.uid()
  ));

create policy waitlist_targets_delete on waitlist_employee_targets for delete
  using (exists (
    select 1 from waitlist_entries we
     where we.id = waitlist_entry_id and we.client_profile_id = auth.uid()
  ));

-- ============================================================================
-- notifications — own row; admin all. Write: own row, read_at only (protected above).
-- ============================================================================

alter table notifications enable row level security;

create policy notifications_select on notifications for select
  using (profile_id = auth.uid() or is_admin());

create policy notifications_update on notifications for update
  using (profile_id = auth.uid() or is_admin() or auth.role() = 'service_role')
  with check (profile_id = auth.uid() or is_admin() or auth.role() = 'service_role');

-- no INSERT/DELETE policy: rows are trigger-written only (0009_triggers.sql); retention
-- has no purge job in the MVP (§12.16).

-- ============================================================================
-- reports — read by the reporter + admin; insert by any authenticated user; resolved by
-- admin only.
-- ============================================================================

alter table reports enable row level security;

create policy reports_select on reports for select
  using (reporter_profile_id = auth.uid() or is_admin());

create policy reports_insert on reports for insert
  with check (reporter_profile_id = auth.uid());

create policy reports_update on reports for update
  using (is_admin())
  with check (is_admin());

-- ============================================================================
-- audit_log — admin read only; trigger-written only (no INSERT/UPDATE/DELETE policy at
-- all — _write_audit_log(), 0009_triggers.sql, is security definer and bypasses RLS).
-- ============================================================================

alter table audit_log enable row level security;

create policy audit_log_select on audit_log for select using (is_admin());

-- ============================================================================
-- Table grants. RLS policies only decide WHICH ROWS a role sees — Postgres's own GRANT
-- system decides whether a role may attempt the operation AT ALL, and local Supabase's
-- config.toml sets `auto_expose_new_tables` unset (the current cloud default), meaning
-- newly created tables get NONE of SELECT/INSERT/UPDATE/DELETE for `anon`/`authenticated`
-- until granted explicitly — confirmed empirically (only TRUNCATE/REFERENCES/TRIGGER exist
-- by default). Every policy above would otherwise be unreachable dead code. `service_role`
-- already has blanket access (BYPASSRLS + its own default grants) and needs nothing here.
-- ============================================================================

grant select on categories, businesses, business_hours, employees,
  employee_availability_rules, services to anon, authenticated;

grant select, update on profiles to authenticated;
grant insert, update, delete on categories to authenticated;
grant insert, update on businesses to authenticated;
grant insert, update, delete on business_hours to authenticated;
grant insert, update, delete on employees to authenticated;
grant insert, update, delete on employee_availability_rules to authenticated;
grant insert, update, delete on services to authenticated;
grant select on appointments to authenticated;
grant select, insert, update on join_requests to authenticated;
grant select, insert, delete on waitlist_entries to authenticated;
grant select, insert, delete on waitlist_employee_targets to authenticated;
grant select, update on notifications to authenticated;
grant select, insert, update on reports to authenticated;
grant select on audit_log to authenticated;

-- _range_diff() is the other private helper (0006_fn_availability.sql) never meant to be
-- called directly — same reasoning as _insert_appointment's revoke, 0007_fn_booking.sql.
revoke execute on function _range_diff(tstzrange, tstzrange) from public;
