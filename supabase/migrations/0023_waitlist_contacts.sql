-- `business_client_contacts` now covers the people on a business's waiting list, not only the
-- people holding an appointment with it.
--
-- 0016 defined this view over `appointments`, which was the whole answer at the time: §10.7's
-- appointments table was the only screen needing a client's name. The waitlist screen
-- (`/dashboard/waitlist`) asks the same question about a different set of people — someone who has
-- registered to be told when a slot frees up has, by definition, **no** appointment yet, so the
-- join found nothing and the business was shown a list of blank names it was meant to call.
--
-- A union rather than a second view: "the clients of this business" is one idea, and two views
-- with the same columns and different populations is how a caller ends up picking the wrong one.
-- The column list is unchanged (profile_id, business_id, full_name, phone), so 0009_views.test.sql's
-- set_eq assertion still pins exactly what may be exposed.
--
-- `security_invoker = false` still means the view runs as its owner and bypasses `profiles_select`
-- entirely, so the WHERE clause remains the entire boundary — the same
-- is_employee_of()/is_owner_of()/is_admin() predicate, applied to both halves.
create or replace view business_client_contacts
with (security_invoker = false) as
  select distinct profile_id, business_id, full_name, phone
  from (
    -- People who booked with this business.
    select
      p.id as profile_id,
      e.business_id,
      p.full_name,
      p.phone
    from appointments a
    join employees e on e.id = a.employee_id
    join profiles  p on p.id = a.client_profile_id
    where is_employee_of(e.business_id)
       or is_owner_of(e.business_id)
       or is_admin()

    union

    -- People waiting for a slot at this business. `waitlist_entries.business_id` is direct — an
    -- entry may name no employee and no service at all (§3.10: "any employee, any service"), which
    -- is why this half cannot be reached through `employees` the way the first half is.
    select
      p.id as profile_id,
      w.business_id,
      p.full_name,
      p.phone
    from waitlist_entries w
    join profiles p on p.id = w.client_profile_id
    where is_employee_of(w.business_id)
       or is_owner_of(w.business_id)
       or is_admin()
  ) as contacts;

comment on view business_client_contacts is
  'Name and phone of a business''s clients — anyone who holds an appointment with it *or* is on '
  'its waiting list — visible only to that business''s ACTIVE staff, its founder, or an admin. '
  'Scoped by the view''s own WHERE clause because security_invoker = false bypasses profiles RLS '
  'by design. Exposes no column beyond full_name and phone — deliberately not date_of_birth, '
  'location, account_type or status.';

grant select on business_client_contacts to authenticated;
