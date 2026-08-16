-- Business staff need to be able to contact the client who booked with them.
--
-- §10.7's dashboard appointments table has "client" and "contact" columns, but `profiles_select`
-- (0010_rls.sql) is `id = auth.uid() or is_admin()` — so a business owner reading their own
-- appointments gets the row, and `null` for every column of the person who booked it. The join
-- succeeds and silently returns nothing, which is the failure mode worth naming: it looks like
-- missing data, not like a permission decision.
--
-- Same shape of fix as 0015's `employee_public_profiles`, and for the same reason: widening
-- `profiles_select` itself would hand the business the client's `date_of_birth`, `location`,
-- `account_type` and `status` as well, none of which it has any business seeing. A view exposes
-- exactly the two columns §10.7 asks for.
--
-- The scope lives in the view's own WHERE clause rather than in RLS. `security_invoker = false`
-- means the view runs as its owner and therefore bypasses `profiles_select` entirely — which is
-- the point, and also why the predicate below has to do the whole job. It reuses the same
-- `is_employee_of()` / `is_owner_of()` / `is_admin()` helpers every other policy is written
-- against, and those read `auth.uid()` per-caller, so the view returns a different set to each
-- signed-in user despite running as its owner.
create or replace view business_client_contacts
with (security_invoker = false) as
  select distinct
    p.id        as profile_id,
    e.business_id,
    p.full_name,
    p.phone
  from appointments a
  join employees e on e.id = a.employee_id
  join profiles  p on p.id = a.client_profile_id
  where is_employee_of(e.business_id)
     or is_owner_of(e.business_id)
     or is_admin();

comment on view business_client_contacts is
  'Name and phone of clients who hold an appointment with a business, visible only to that '
  'business''s ACTIVE staff, its founder, or an admin. Scoped by the view''s own WHERE clause '
  'because security_invoker = false bypasses profiles RLS by design. Exposes no column beyond '
  'full_name and phone — deliberately not date_of_birth, location, account_type or status.';

-- anon is intentionally absent: a client's contact details are never public.
grant select on business_client_contacts to authenticated;
