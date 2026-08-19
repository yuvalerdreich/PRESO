-- Colleagues need each other's contact details; the roster screen (§10.7) has no way to read them.
--
-- The third view in this family, and the same fix for the same reason as 0015's
-- `employee_public_profiles` and 0016's `business_client_contacts`: `profiles_select`
-- (0010_rls.sql) is `id = auth.uid() or is_admin()`, so a business owner opening
-- `/dashboard/staff` reads their *own* row in full and gets `null` for every column of the
-- colleague standing at the next chair. The join succeeds and returns nothing, which reads as
-- missing data rather than as a permission decision.
--
-- `employee_public_profiles` deliberately stops at name and photo — it is granted to `anon` and
-- feeds the public booking page, where a staff member's phone number has no business appearing.
-- The staff-side answer has to be a separate view with a narrower audience, exactly as the client
-- side needed one.
--
-- Email is the reason this cannot be a plain projection of `profiles` at all: it lives on
-- `auth.users`, which is not readable by `authenticated` under any policy. `security_invoker =
-- false` runs the view as its owner, which can read it — so the WHERE clause below is the entire
-- security boundary, and it reuses the same `is_employee_of()` / `is_owner_of()` / `is_admin()`
-- helpers every policy is written against. Those read `auth.uid()` per-caller, so the view
-- returns a different set to each signed-in user despite running as its owner.
create or replace view business_staff_contacts
with (security_invoker = false) as
  select
    e.id         as employee_id,
    e.business_id,
    p.id         as profile_id,
    p.phone,
    u.email::text as email
  from employees e
  join profiles    p on p.id = e.profile_id
  join auth.users  u on u.id = p.id
  where is_employee_of(e.business_id)
     or is_owner_of(e.business_id)
     or is_admin();

comment on view business_staff_contacts is
  'Phone and sign-in email of a business''s own staff, visible only to that business''s ACTIVE '
  'staff, its founder, or an admin. Scoped by the view''s own WHERE clause because '
  'security_invoker = false bypasses profiles RLS — and auth.users, which holds the email — by '
  'design. Name and photo are deliberately absent: those are public and already come from '
  'employee_public_profiles, so this view carries only the columns that must not be.';

-- anon is intentionally absent: staff contact details are never public. The public booking page
-- reads employee_public_profiles instead, which stops at name and photo.
grant select on business_staff_contacts to authenticated;

-- ============================================================================
-- business_join_request_contacts — who is asking to join, §4.2 / §6.8 rule 6
-- ============================================================================
--
-- The same trap one step earlier in the roster's life. `listJoinRequests()` embedded
-- `profiles!join_requests_profile_id_fkey(full_name)` to name the applicant, and that embed is
-- scoped by `profiles_select` like any other read — so the founder was being asked to approve or
-- reject a request from a blank name.
--
-- An applicant has **no `employees` row yet** (§6.8 rule 5: approval is what creates staff), so
-- `business_staff_contacts` above cannot answer this; the join has to hang off `join_requests`
-- itself. `full_name` is included here, unlike in the staff view, because there is no public
-- projection to fall back on — an applicant is not yet on anyone's roster.
--
-- Scoped to the same audience that may already read the request rows themselves: staff may look,
-- only the founder may decide (`decide_join_request()` re-checks that, and RLS is the third layer).
create or replace view business_join_request_contacts
with (security_invoker = false) as
  select
    j.id         as request_id,
    j.business_id,
    p.id         as profile_id,
    p.full_name,
    p.phone,
    u.email::text as email
  from join_requests j
  join profiles   p on p.id = j.profile_id
  join auth.users u on u.id = j.profile_id
  where is_employee_of(j.business_id)
     or is_owner_of(j.business_id)
     or is_admin();

comment on view business_join_request_contacts is
  'Name, phone and sign-in email of the people who have asked to join a business, visible only to '
  'that business''s ACTIVE staff, its founder, or an admin. Exists because an applicant holds no '
  'employees row yet, so employee_public_profiles cannot name them and profiles RLS hides them.';

grant select on business_join_request_contacts to authenticated;
