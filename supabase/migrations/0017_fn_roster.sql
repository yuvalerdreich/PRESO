-- Three roster writes that cannot be done correctly from the application (TECHNICAL_DESIGN.md
-- §4.1, §4.2, §6.8 rule 3, §6.9).
--
-- The common reason: each is a multi-row invariant, and PostgREST gives one statement per request
-- with no transaction spanning them. §6.8 rule 3 says a business is created with its first
-- employee "in one transaction", and §4.2 says approving a join request inserts `employees` and
-- flips the request "one transaction" — a sequential pair of calls satisfies neither. A crash or
-- a lost race between the two calls leaves a business with zero employees, which is precisely the
-- state the rule exists to forbid.
--
-- §8.2 already anticipated this file without naming it: its mapping table lists
-- `raise 'last_employee'` → 422, an error only a database-side `remove_employee` can raise.
--
-- All three are `security definer`, so they bypass RLS and must re-check authorisation
-- themselves — done first in every function, using the same `insufficient_privilege` / `42501`
-- convention as 0007_fn_booking.sql so `fromPostgresError()` maps them without a special case.

-- ============================================================================
-- create_business_with_owner — §6.8 rule 3
-- ============================================================================
create or replace function create_business_with_owner(
  p_name                      text,
  p_category_id               uuid,
  p_address                   text,
  p_area                      text,
  p_phone                     text,
  p_description               text default null,
  p_timezone                  text default 'Asia/Jerusalem',
  p_approval_policy           approval_policy default 'AUTO',
  p_cancellation_window_hours int default 24,
  p_position_title            text default 'Owner'
) returns businesses
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor   uuid := auth.uid();
  v_profile profiles%rowtype;
  v_business businesses%rowtype;
begin
  if v_actor is null then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  select * into v_profile from profiles where id = v_actor;

  -- Mirrors the businesses_insert RLS policy this function bypasses: only an ACTIVE BUSINESS
  -- account may open a business. A CLIENT upgrades through claim_business_account_type() first.
  if v_profile.id is null
     or v_profile.status <> 'ACTIVE'
     or v_profile.account_type <> 'BUSINESS'
  then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  insert into businesses (
    owner_profile_id, name, description, category_id, address, area, phone,
    timezone, approval_policy, cancellation_window_hours
  ) values (
    v_actor, p_name, p_description, p_category_id, p_address, p_area, p_phone,
    p_timezone, p_approval_policy, p_cancellation_window_hours
  )
  returning * into v_business;

  -- The creator becomes employee #1, in this same transaction. If either statement fails the
  -- whole thing rolls back and no half-built business survives.
  insert into employees (business_id, profile_id, position_title, status)
  values (v_business.id, v_actor, p_position_title, 'ACTIVE');

  return v_business;
end;
$$;

-- ============================================================================
-- decide_join_request — §4.2, §6.8 rules 5 and 6
-- ============================================================================
create or replace function decide_join_request(
  p_request_id     uuid,
  p_decision       join_request_status,
  p_position_title text default 'Staff'
) returns join_requests
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor    uuid := auth.uid();
  v_request  join_requests%rowtype;
  v_business businesses%rowtype;
begin
  if p_decision not in ('APPROVED', 'REJECTED') then
    raise exception 'illegal_transition';
  end if;

  select * into v_request from join_requests where id = p_request_id;
  if v_request.id is null then
    raise exception 'not_found' using errcode = '23503';
  end if;

  select * into v_business from businesses where id = v_request.business_id;

  -- §6.8 rule 6 — deciding join requests is the founder's one remaining exclusive power (§12.1).
  -- Staff may read requests but never decide them.
  if v_actor is null or v_business.owner_profile_id <> v_actor then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  -- Only a PENDING request is decidable; re-deciding a settled one is not a legal transition.
  if v_request.status <> 'PENDING' then
    raise exception 'illegal_transition';
  end if;

  update join_requests
     set status = p_decision, decided_by = v_actor, decided_at = now()
   where id = p_request_id
  returning * into v_request;

  -- §6.8 rule 5 — no employees row exists until this moment. Approval is what makes someone
  -- staff; there is no "inactive pending" employee row to activate.
  if p_decision = 'APPROVED' then
    insert into employees (business_id, profile_id, position_title, status)
    values (v_request.business_id, v_request.profile_id, p_position_title, 'ACTIVE')
    on conflict (business_id, profile_id) do update set status = 'ACTIVE';
  end if;

  return v_request;
end;
$$;

-- ============================================================================
-- remove_employee — §4.2, §6.9
-- ============================================================================
-- Returns true when the position was retired rather than deleted — see the soft-delete note at
-- the end of the function.
create or replace function remove_employee(p_employee_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor     uuid := auth.uid();
  v_employee  employees%rowtype;
  v_business  businesses%rowtype;
  v_remaining int;
  v_future    int;
  v_retired   boolean := false;
begin
  select * into v_employee from employees where id = p_employee_id;
  if v_employee.id is null then
    raise exception 'not_found' using errcode = '23503';
  end if;

  select * into v_business from businesses where id = v_employee.business_id;

  -- Roster management stays owner-only even under §12.1's equal-management-rights decision.
  if v_actor is null or v_business.owner_profile_id <> v_actor then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  -- §6.8 rule 3, the other half: a business must never reach zero **active** employees. Counted
  -- and applied in one transaction so two concurrent removals cannot each see "2 remaining" and
  -- both proceed. ACTIVE is the right thing to count: a retired position (see below) still has a
  -- row, and letting it satisfy the rule would leave a business that looks staffed but is
  -- unbookable.
  select count(*) into v_remaining
    from employees
   where business_id = v_employee.business_id
     and id <> p_employee_id
     and status = 'ACTIVE';

  if v_remaining = 0 then
    raise exception 'last_employee';   -- §8.2: 422
  end if;

  -- §6.9 — those appointments have to be cancelled explicitly first, because each cancellation
  -- notifies its client. Silently deleting the employee would strand people with a booking.
  select count(*) into v_future
    from appointments
   where employee_id = p_employee_id
     and status <> 'CANCELLED'
     and upper(slot) > now();

  if v_future > 0 then
    raise exception 'employee_has_appointments';   -- §8.2 family: 422
  end if;

  -- Hard-delete when the position has no history, retire it when it does — the same shape as
  -- §4.3's soft delete for services, and for the same reason: `appointments.employee_id` is
  -- `on delete restrict` so past bookings survive (§6.9). Without this branch an employee who
  -- has ever taken a single appointment could never be removed at all, only deactivated by hand.
  --
  -- The exception handler is safe here in a way it was not in claim_waitlist_entry() (§12.31):
  -- a BEGIN…EXCEPTION block opens a subtransaction, so only the failed DELETE is rolled back and
  -- the compensating UPDATE commits. What is impossible is compensating for an exception that
  -- *escapes* the function, which is the case that bit us before.
  begin
    delete from employees where id = p_employee_id;
  exception when foreign_key_violation then
    update employees set status = 'INACTIVE' where id = p_employee_id;
    v_retired := true;
  end;

  perform _write_audit_log(
    case when v_retired then 'employee.retire' else 'employee.remove' end,
    'employees', p_employee_id,
    jsonb_build_object(
      'businessId', v_employee.business_id,
      'profileId', v_employee.profile_id,
      'retained', v_retired
    )
  );

  return v_retired;
end;
$$;
