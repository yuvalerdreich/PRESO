-- delete_business() — requested change, superseding 0010_rls.sql's businesses policy comment
-- ("no DELETE policy — §4.1: 'not offered', suspension replaces deletion"). Deletion is now
-- offered, from `/businesses`, to the owner only, and only once no future appointment is left
-- unresolved. See the updated ARCHITECTURE.md/TECHNICAL_DESIGN.md §12.x for the decision.
--
-- `security definer`, like every other multi-row-invariant writer in the 0017_fn_roster.sql
-- family: only the owner may call it (mirrors remove_employee()'s "roster management stays
-- owner-only" rule), re-checked here since RLS never runs underneath a security definer call.
-- Still no `businesses_delete` RLS policy and no DELETE grant to `authenticated` on `businesses`
-- — this RPC is deliberately the only path in, the same "one write path" shape §2 already uses
-- for `appointments`.
--
-- Unlike remove_employee()'s soft-delete-on-conflict, this is a genuine hard delete of
-- everything under the business: the business itself carries no history of its own the way an
-- individual employee/service row does (past appointments belong to the *employee*, not the
-- business row), so there is no partial state worth falling back to once the owner has
-- confirmed. `appointments.employee_id`/`service_id` are `on delete restrict`
-- (0003_tables.sql), which would otherwise block deleting the business's employees/services —
-- so this explicitly deletes the business's appointments (including past/cancelled ones) first,
-- then lets deleting the business row cascade the rest: business_hours, employees (→
-- employee_availability_rules, services), join_requests, waitlist_entries (→
-- waitlist_employee_targets) are all `on delete cascade` (0003_tables.sql).
create or replace function delete_business(p_business_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor     uuid := auth.uid();
  v_business  businesses%rowtype;
  v_future    int;
  v_staff_ids uuid[];
  v_staff_id  uuid;
begin
  select * into v_business from businesses where id = p_business_id;
  if v_business.id is null then
    raise exception 'not_found' using errcode = '23503';
  end if;

  -- Roster management stays owner-only (0010_rls.sql's employees policy comment); deleting the
  -- whole business is the same class of decision, one level up.
  if v_actor is null or v_business.owner_profile_id <> v_actor then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  -- Business-wide, unlike remove_employee()'s single-employee check: every employee's future,
  -- non-cancelled appointments count.
  select count(*) into v_future
    from appointments a
    join employees e on e.id = a.employee_id
   where e.business_id = p_business_id
     and a.status <> 'CANCELLED'
     and upper(a.slot) > now();

  if v_future > 0 then
    raise exception 'business_has_appointments';   -- §8.2 family: 422
  end if;

  -- Captured before the cascade removes the employees rows that would otherwise answer this.
  -- The owner performed this action themselves and needs no notice of it.
  select coalesce(array_agg(profile_id), '{}')
    into v_staff_ids
    from employees
   where business_id = p_business_id and status = 'ACTIVE' and profile_id <> v_actor;

  -- Historical appointments have no other home once the business is gone; delete them
  -- explicitly so the `on delete restrict` FKs above don't block the cascade below.
  delete from appointments
   where employee_id in (select id from employees where business_id = p_business_id);

  perform _write_audit_log('business.delete', 'businesses', p_business_id,
    jsonb_build_object('name', v_business.name));

  delete from businesses where id = p_business_id;

  foreach v_staff_id in array v_staff_ids loop
    insert into notifications (profile_id, type, payload)
    values (v_staff_id, 'BUSINESS_DELETED', jsonb_build_object('businessName', v_business.name));
  end loop;
end;
$$;
