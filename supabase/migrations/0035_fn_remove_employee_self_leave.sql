-- Requested change: a staff member who is not the business's owner can leave a business
-- themselves, from `/businesses`, without asking the owner to remove them. Restated from
-- 0017_fn_roster.sql (`create or replace function` needs the whole body); the only change is the
-- authorization check at the top — every other rule (§6.8 rule 3's last-ACTIVE-employee floor,
-- §6.9's future-appointments refusal, the hard-delete-or-retire branch, the audit log) is exactly
-- the same function doing exactly the same thing, because "an employee leaves" and "the owner
-- removes an employee" are the same database operation with a different caller.
--
-- The owner may **not** use this path to remove themselves — see the comment inline. Their
-- equivalent is delete_business() (§12.74, 0034), a decision about the whole business rather than
-- a roster edit.
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

  if v_actor is null then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  -- Removing *someone else* stays owner-only (§12.1's carve-out, unchanged). An employee may now
  -- also remove their own position — "leaving" — but the owner may not self-remove this way: it
  -- would leave `businesses.owner_profile_id` pointing at someone with no `employees` row, which
  -- is not a state this function is meant to create.
  if v_employee.profile_id = v_actor then
    if v_business.owner_profile_id = v_actor then
      raise exception 'insufficient_privilege' using errcode = '42501';
    end if;
  elsif v_business.owner_profile_id <> v_actor then
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
