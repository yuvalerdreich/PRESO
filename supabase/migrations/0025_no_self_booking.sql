-- book_appointment(), replaced: nobody books themselves at a business they own or work at
-- (TECHNICAL_DESIGN.md §12.55).
--
-- The appointment this forbids is not a harmless oddity. Every one of them consumes a slot in the
-- *staff member's own* diary through the exclusion constraint, so a stylist who "books" themselves
-- has silently closed that time to paying clients while the business's own tools for closing time
-- — a BLOCK rule, a day off, a shorter shift — sit unused one screen away. It also shows up in the
-- client portal as an appointment the person is due to attend at their own chair.
--
-- Owner *and* ACTIVE employee, because §12.1 already treats them as one class for everything but
-- join requests, and because `employees` is a position rather than a person-record: the founder is
-- employee #1 (§6.8 rule 3), so owner-only would leave every colleague able to do it.
--
-- An INACTIVE employee — a retired position — is deliberately *not* covered. They no longer work
-- there, and a former stylist booking a haircut is an ordinary client.
--
-- This is the last enforcement layer, not the only one: the discovery grid badges these businesses
-- as "העסק שלך" and the business page refuses to render the booking flow for them. Both are
-- presentation. `book_appointment()` is the single write path to `appointments` (§2), so this is
-- the check a hand-made `POST /api/appointments` has to get past.
--
-- Signature is unchanged, so `create or replace` suffices — no drop, unlike 0020/0024. The body is
-- 0007_fn_booking.sql's verbatim plus the one guard.

create or replace function book_appointment(
  p_client_profile_id uuid,
  p_employee_id       uuid,
  p_service_id        uuid,
  p_starts_at         timestamptz,
  p_actor_profile_id  uuid
) returns appointments
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_employee employees%rowtype;
  v_business businesses%rowtype;
  v_client   profiles%rowtype;
  v_is_staff boolean;
begin
  select * into v_employee from employees where id = p_employee_id;
  if v_employee.id is not null then
    select * into v_business from businesses where id = v_employee.business_id;
  end if;
  select * into v_client from profiles where id = p_client_profile_id;

  if v_employee.id is null or v_business.id is null or v_client.id is null then
    raise exception 'not_found' using errcode = '23503';
  end if;

  -- §6.2 step 1 — actor checks
  v_is_staff := exists (
    select 1 from employees e
     where e.business_id = v_employee.business_id
       and e.profile_id  = p_actor_profile_id
       and e.status = 'ACTIVE'
  );

  if not (p_actor_profile_id = p_client_profile_id or v_is_staff) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  if v_client.status <> 'ACTIVE' or v_business.status <> 'ACTIVE' then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  -- §12.55 — the client may not be this business's own owner or one of its ACTIVE staff. Note it
  -- tests the *client*, never the actor: staff booking on behalf of a real client is the whole
  -- point of `p_client_profile_id` (§12.x staff-initiated bookings) and stays allowed.
  if v_business.owner_profile_id = p_client_profile_id
     or exists (
       select 1 from employees e
        where e.business_id = v_employee.business_id
          and e.profile_id  = p_client_profile_id
          and e.status = 'ACTIVE'
     )
  then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  return _insert_appointment(
    p_client_profile_id, p_employee_id, p_service_id, p_starts_at,
    p_actor_profile_id, v_is_staff
  );
end;
$$;
