-- book_appointment / cancel_appointment / reschedule_appointment / approve_appointment /
-- reject_appointment (TECHNICAL_DESIGN.md §6.2–§6.4, §12.30) — the ONLY writers of
-- `appointments`. RLS (0010_rls.sql) grants no direct INSERT/UPDATE privilege on that
-- table; these five security-definer RPCs are the whole write path. approve/reject are a
-- §12.30 addition — §1's file-plan named only book/cancel/reschedule for this migration,
-- but RLS's "no direct write, RPC only" and the approve|reject PATCH action (§4.4, §5.4)
-- require them to exist somewhere, and they belong with their siblings here.
--
-- _insert_appointment() is a private implementation helper (not part of the documented RPC
-- surface) holding book_appointment's steps 3–6, shared verbatim by reschedule_appointment's
-- insert half (§6.4 step 4: "same logic as book_appointment steps 3–6"). It does NOT
-- perform its own authorization check — book_appointment and reschedule_appointment each
-- authorise their own caller first, using two genuinely different rules (§6.2 step 1 vs
-- §6.3 step 1), then delegate here. It is deliberately NOT security definer: called from
-- inside a security-definer function it inherits that elevated context, but a stray direct
-- call from anon/authenticated would run as that low-privilege role and be blocked by RLS
-- on the appointments INSERT — defense in depth on top of the explicit REVOKE below.
create or replace function _insert_appointment(
  p_client_profile_id uuid,
  p_employee_id       uuid,
  p_service_id        uuid,
  p_starts_at         timestamptz,
  p_actor_profile_id  uuid,
  p_pre_approved       boolean
) returns appointments
language plpgsql
volatile
set search_path = public
as $$
declare
  v_service     services%rowtype;
  v_employee    employees%rowtype;
  v_business    businesses%rowtype;
  v_slot        tstzrange;
  v_status      appointment_status;
  v_appointment appointments%rowtype;
begin
  select * into v_service  from services  where id = p_service_id;
  select * into v_employee from employees where id = p_employee_id;
  if v_employee.id is not null then
    select * into v_business from businesses where id = v_employee.business_id;
  end if;

  -- §6.2 step 2 — "an employee must offer ≥1 ACTIVE service" is implied by service_id
  -- resolving to an ACTIVE service owned by this employee (TECHNICAL_DESIGN.md §12.10)
  if v_service.id is null or v_employee.id is null or v_business.id is null
     or v_service.employee_id <> p_employee_id or v_service.status <> 'ACTIVE'
  then
    raise exception 'slot_unavailable';
  end if;

  -- §6.2 step 3
  v_slot := tstzrange(p_starts_at,
                       p_starts_at + make_interval(mins => v_service.duration_minutes), '[)');

  -- §6.2 step 4 — re-check against a snapshot. This does NOT decide races — it only
  -- catches vacations/blocks/closed hours changed since the client last fetched
  -- availability. The appointments_no_overlap exclusion constraint on the INSERT below is
  -- what actually rules on a concurrent race.
  if not exists (
    select 1 from get_available_slots(p_employee_id, p_service_id, p_starts_at, upper(v_slot))
     where starts_at = p_starts_at
  ) then
    raise exception 'slot_unavailable';
  end if;

  -- §6.2 step 5
  v_status := case
    when p_pre_approved                       then 'CONFIRMED'   -- staff-created is pre-approved
    when v_business.approval_policy = 'AUTO'  then 'CONFIRMED'
    else 'PENDING'
  end;

  -- §6.2 step 6 — a concurrent insert for the same employee/overlapping slot fails here
  -- with SQLSTATE 23P01 (appointments_no_overlap), which the route handler maps to 409.
  insert into appointments (client_profile_id, employee_id, service_id, slot, status, created_by)
  values (p_client_profile_id, p_employee_id, p_service_id, v_slot, v_status, p_actor_profile_id)
  returning * into v_appointment;

  return v_appointment;
end;
$$;

revoke execute on function _insert_appointment(uuid, uuid, uuid, timestamptz, uuid, boolean) from public;

-- book_appointment() — client self-booking or staff manual creation (PDF §6.8), same
-- write path and same constraint either way (TECHNICAL_DESIGN.md §4.4).
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

  return _insert_appointment(
    p_client_profile_id, p_employee_id, p_service_id, p_starts_at,
    p_actor_profile_id, v_is_staff
  );
end;
$$;

-- cancel_appointment() — always soft (TECHNICAL_DESIGN.md §6.3). A hard delete would free
-- the slot too, but would destroy the audit trail and the client's history.
create or replace function cancel_appointment(
  p_appointment_id   uuid,
  p_actor_profile_id uuid
) returns appointments
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_appt                 appointments%rowtype;
  v_employee              employees%rowtype;
  v_business              businesses%rowtype;
  v_actor                 profiles%rowtype;
  v_is_client             boolean;
  v_is_assigned_employee  boolean;
  v_is_owner              boolean;
  v_is_admin              boolean;
begin
  select * into v_appt from appointments where id = p_appointment_id;
  if v_appt.id is null then
    raise exception 'not_found' using errcode = '23503';
  end if;

  select * into v_employee from employees  where id = v_appt.employee_id;
  select * into v_business from businesses where id = v_employee.business_id;
  select * into v_actor    from profiles   where id = p_actor_profile_id;

  -- §6.3 step 1 — booking client, assigned employee, business owner, or admin
  v_is_client            := (p_actor_profile_id = v_appt.client_profile_id);
  v_is_assigned_employee := exists (
    select 1 from employees e where e.id = v_appt.employee_id and e.profile_id = p_actor_profile_id
  );
  v_is_owner := (v_business.owner_profile_id = p_actor_profile_id);
  v_is_admin := (v_actor.account_type = 'ADMIN');

  if not (v_is_client or v_is_assigned_employee or v_is_owner or v_is_admin) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  -- §6.3 step 2 — already cancelled is not re-cancellable (§5.4: illegal transition, 422)
  if v_appt.status not in ('PENDING', 'CONFIRMED') then
    raise exception 'illegal_transition';
  end if;

  -- §6.3 step 3 — the cancellation window applies to the client only; staff and admins
  -- may always cancel
  if v_is_client and not (v_is_assigned_employee or v_is_owner or v_is_admin)
     and now() > lower(v_appt.slot) - make_interval(hours => v_business.cancellation_window_hours)
  then
    raise exception 'cancellation_window_closed';
  end if;

  -- §6.3 steps 4–5 — the row leaves the appointments_no_overlap index via its own
  -- `WHERE status <> 'CANCELLED'` clause the moment this commits; that is what frees the
  -- slot. Step 6 (notifications + waitlist matcher) is an AFTER UPDATE trigger, 0009.
  update appointments
     set status = 'CANCELLED', cancelled_at = now(), cancelled_by = p_actor_profile_id
   where id = p_appointment_id
  returning * into v_appt;

  return v_appt;
end;
$$;

-- reschedule_appointment() (TECHNICAL_DESIGN.md §6.4, [+] PDF §6.8 עריכה) — cancel + insert
-- in ONE transaction, so a lost race on the new slot rolls back both statements and the
-- original appointment survives untouched. This is why it is one function and not
-- "cancel then book" from the client.
create or replace function reschedule_appointment(
  p_appointment_id   uuid,
  p_new_starts_at    timestamptz,
  p_actor_profile_id uuid
) returns appointments
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_old                   appointments%rowtype;
  v_employee               employees%rowtype;
  v_business               businesses%rowtype;
  v_actor                  profiles%rowtype;
  v_is_client              boolean;
  v_is_assigned_employee   boolean;
  v_is_owner               boolean;
  v_is_admin               boolean;
  v_is_staff               boolean;
  v_new                    appointments%rowtype;
begin
  select * into v_old from appointments where id = p_appointment_id;
  if v_old.id is null then
    raise exception 'not_found' using errcode = '23503';
  end if;

  select * into v_employee from employees  where id = v_old.employee_id;
  select * into v_business from businesses where id = v_employee.business_id;
  select * into v_actor    from profiles   where id = p_actor_profile_id;

  -- §6.4 step 1 — "authorise exactly as cancel_appointment (step 1)"
  v_is_client            := (p_actor_profile_id = v_old.client_profile_id);
  v_is_assigned_employee := exists (
    select 1 from employees e where e.id = v_old.employee_id and e.profile_id = p_actor_profile_id
  );
  v_is_owner := (v_business.owner_profile_id = p_actor_profile_id);
  v_is_admin := (v_actor.account_type = 'ADMIN');

  if not (v_is_client or v_is_assigned_employee or v_is_owner or v_is_admin) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  -- §6.4 step 2
  if v_old.status not in ('PENDING', 'CONFIRMED') then
    raise exception 'illegal_transition';
  end if;

  -- same "staff-created is pre-approved" rule as book_appointment step 5's first branch
  v_is_staff := exists (
    select 1 from employees e
     where e.business_id = v_employee.business_id
       and e.profile_id  = p_actor_profile_id
       and e.status = 'ACTIVE'
  );

  -- Both writes below are one logical operation ("rescheduled"), not a cancel + a fresh
  -- booking. The appointments AFTER INSERT/UPDATE triggers (0009_triggers.sql) check this
  -- transaction-local flag and skip their own generic CREATED/CANCELLED/REJECTED
  -- notification for these two rows — this function sends one APPOINTMENT_RESCHEDULED
  -- notice instead, below. The waitlist matcher still fires either way (§6.7's diagram
  -- explicitly names reschedule_appointment as a trigger source, unlike notifications).
  perform set_config('app.suppress_appt_notify', 'true', true);

  -- §6.4 step 3 — cancel the old row
  update appointments
     set status = 'CANCELLED', cancelled_at = now(), cancelled_by = p_actor_profile_id
   where id = p_appointment_id;

  -- §6.4 step 4 — insert the new row. If this raises (slot gone, or a lost race at the
  -- exclusion constraint), the exception propagates out of this function uncaught, so
  -- Postgres rolls back the whole transaction — including the UPDATE above (and the
  -- set_config call, which is itself transaction-local).
  v_new := _insert_appointment(
    v_old.client_profile_id, v_old.employee_id, v_old.service_id, p_new_starts_at,
    p_actor_profile_id, v_is_staff
  );

  perform set_config('app.suppress_appt_notify', 'false', true);

  declare
    v_recipient      uuid;
    v_business_name  text;
    v_employee_name  text;
    v_service_name   text;
    v_timezone       text;
  begin
    select b.name, b.timezone, s.name, p.full_name
      into v_business_name, v_timezone, v_service_name, v_employee_name
      from employees e
      join businesses b on b.id = e.business_id
      join services  s on s.id = v_new.service_id
      join profiles  p on p.id = e.profile_id
     where e.id = v_new.employee_id;

    -- notify whoever did NOT perform the reschedule
    v_recipient := case when p_actor_profile_id = v_old.client_profile_id
                         then (select profile_id from employees where id = v_new.employee_id)
                         else v_new.client_profile_id
                    end;

    insert into notifications (profile_id, type, payload)
    values (
      v_recipient, 'APPOINTMENT_RESCHEDULED',
      jsonb_build_object(
        'appointmentId', v_new.id, 'businessName', v_business_name,
        'employeeName', v_employee_name, 'serviceName', v_service_name,
        'startsAt', lower(v_new.slot), 'timezone', v_timezone,
        'previousStartsAt', lower(v_old.slot)
      )
    );
  end;

  return v_new;
end;
$$;

-- approve_appointment() / reject_appointment() — the other two appointment-status RPCs
-- implied by RLS's "no direct write, RPC only" (§3.14) and the approve|reject PATCH action
-- (§4.4, §5.4), whose own one-line file-plan description for this migration named only
-- book/cancel/reschedule. Unlike cancel_appointment(), the client is deliberately NOT in
-- the actor set here — approving/rejecting is the business's decision on a request the
-- client made; letting the client approve their own PENDING row would let them bypass
-- approval_policy='MANUAL' entirely.
create or replace function approve_appointment(
  p_appointment_id   uuid,
  p_actor_profile_id uuid
) returns appointments
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_appt                 appointments%rowtype;
  v_employee              employees%rowtype;
  v_business              businesses%rowtype;
  v_actor                 profiles%rowtype;
  v_is_assigned_employee  boolean;
  v_is_owner              boolean;
  v_is_admin              boolean;
begin
  select * into v_appt from appointments where id = p_appointment_id;
  if v_appt.id is null then
    raise exception 'not_found' using errcode = '23503';
  end if;

  select * into v_employee from employees  where id = v_appt.employee_id;
  select * into v_business from businesses where id = v_employee.business_id;
  select * into v_actor    from profiles   where id = p_actor_profile_id;

  -- §6.5: "PENDING → CONFIRMED | business owner (any appointment) · assigned employee (own only)"
  v_is_assigned_employee := exists (
    select 1 from employees e where e.id = v_appt.employee_id and e.profile_id = p_actor_profile_id
  );
  v_is_owner := (v_business.owner_profile_id = p_actor_profile_id);
  v_is_admin := (v_actor.account_type = 'ADMIN');

  if not (v_is_assigned_employee or v_is_owner or v_is_admin) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  if v_appt.status <> 'PENDING' then
    raise exception 'illegal_transition';
  end if;

  -- §6.9 edge case: a PENDING row is already in the exclusion index (its status is
  -- already <> 'CANCELLED'), so the slot it holds cannot have been double-booked since
  -- insert. Approval is a pure status change — it cannot fail on overlap.
  update appointments set status = 'CONFIRMED' where id = p_appointment_id
  returning * into v_appt;

  return v_appt;
end;
$$;

create or replace function reject_appointment(
  p_appointment_id   uuid,
  p_actor_profile_id uuid,
  p_reason            text default null
) returns appointments
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_appt                 appointments%rowtype;
  v_employee              employees%rowtype;
  v_business              businesses%rowtype;
  v_actor                 profiles%rowtype;
  v_is_assigned_employee  boolean;
  v_is_owner              boolean;
  v_is_admin              boolean;
begin
  select * into v_appt from appointments where id = p_appointment_id;
  if v_appt.id is null then
    raise exception 'not_found' using errcode = '23503';
  end if;

  select * into v_employee from employees  where id = v_appt.employee_id;
  select * into v_business from businesses where id = v_employee.business_id;
  select * into v_actor    from profiles   where id = p_actor_profile_id;

  v_is_assigned_employee := exists (
    select 1 from employees e where e.id = v_appt.employee_id and e.profile_id = p_actor_profile_id
  );
  v_is_owner := (v_business.owner_profile_id = p_actor_profile_id);
  v_is_admin := (v_actor.account_type = 'ADMIN');

  if not (v_is_assigned_employee or v_is_owner or v_is_admin) then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  -- reject only makes sense from PENDING — an already-CONFIRMED appointment is cancelled,
  -- not rejected (§12.18: the enum has no separate REJECTED state; this is the same
  -- CANCELLED transition as cancel_appointment, distinguished for notification purposes by
  -- the appointments AFTER UPDATE trigger checking old.status = 'PENDING', 0009_triggers.sql)
  if v_appt.status <> 'PENDING' then
    raise exception 'illegal_transition';
  end if;

  -- Suppress the generic appointments-trigger notification (0009_triggers.sql) — it has
  -- no way to carry p_reason, which has no column to persist to (TECHNICAL_DESIGN.md's
  -- schema doesn't have one). This function sends its own APPOINTMENT_REJECTED notice
  -- instead, with the reason folded into the payload as an extra key beyond §3.11's
  -- documented NotificationPayload shape (harmless if the frontend ignores it). The
  -- waitlist matcher still fires — the generic trigger only skips its notification half,
  -- same as the reschedule path above.
  perform set_config('app.suppress_appt_notify', 'true', true);

  update appointments
     set status = 'CANCELLED', cancelled_at = now(), cancelled_by = p_actor_profile_id
   where id = p_appointment_id
  returning * into v_appt;

  perform set_config('app.suppress_appt_notify', 'false', true);

  declare
    v_business_name text;
    v_employee_name text;
    v_service_name  text;
    v_timezone      text;
    v_payload       jsonb;
  begin
    select b.name, b.timezone, s.name, p.full_name
      into v_business_name, v_timezone, v_service_name, v_employee_name
      from employees e
      join businesses b on b.id = e.business_id
      join services  s on s.id = v_appt.service_id
      join profiles  p on p.id = e.profile_id
     where e.id = v_appt.employee_id;

    v_payload := jsonb_build_object(
      'appointmentId', v_appt.id, 'businessName', v_business_name,
      'employeeName', v_employee_name, 'serviceName', v_service_name,
      'startsAt', lower(v_appt.slot), 'timezone', v_timezone
    );
    if p_reason is not null then
      v_payload := v_payload || jsonb_build_object('reason', p_reason);
    end if;

    insert into notifications (profile_id, type, payload)
    values (v_appt.client_profile_id, 'APPOINTMENT_REJECTED', v_payload);
  end;

  return v_appt;
end;
$$;
