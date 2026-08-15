-- Notification triggers, audit_log, and the waitlist matcher wiring (TECHNICAL_DESIGN.md
-- §1's file-plan for this migration). Three concerns, kept as separate trigger functions
-- per concern rather than one large dispatcher, so each is easy to reason about alone:
--   1. profiles mirror + business timezone validation (data integrity, not notifications)
--   2. join_requests / appointments notifications (+ the waitlist matcher on cancellation)
--   3. audit_log, for the security-relevant actions named in §8.5

-- ============================================================================
-- 1. Data integrity triggers
-- ============================================================================

-- profiles mirrors auth.users 1:1 (§3.2). ADMIN can never be self-provisioned at sign-up
-- (§6.8 rules 1–2) — the Zod schema on the client is the first check, this trigger is the
-- database's own backstop regardless of what a client sends as user_metadata.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_type account_type;
begin
  v_account_type := case
    when new.raw_user_meta_data ->> 'account_type' = 'BUSINESS' then 'BUSINESS'::account_type
    else 'CLIENT'::account_type   -- default AND explicit refusal of 'ADMIN' or anything else
  end;

  insert into profiles (id, full_name, phone, account_type)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'phone',
    v_account_type
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- businesses.timezone validation (§3.4): "validated by a trigger calling
-- now() at time zone new.timezone — an invalid IANA name raises and the row is rejected."
-- Postgres's own error on an unrecognized zone name is exactly that rejection; nothing
-- else to do here.
create or replace function validate_business_timezone()
returns trigger
language plpgsql
as $$
begin
  perform now() at time zone new.timezone;
  return new;
end;
$$;

create trigger businesses_validate_timezone
  before insert or update of timezone on businesses
  for each row execute function validate_business_timezone();

-- ============================================================================
-- 2. Notifications + the waitlist matcher
-- ============================================================================

create or replace function notify_join_request_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id      uuid;
  v_business_name text;
  v_applicant     text;
begin
  select owner_profile_id, name into v_owner_id, v_business_name
    from businesses where id = new.business_id;
  select full_name into v_applicant from profiles where id = new.profile_id;

  insert into notifications (profile_id, type, payload)
  values (
    v_owner_id, 'JOIN_REQUEST_RECEIVED',
    jsonb_build_object(
      'businessId', new.business_id, 'businessName', v_business_name,
      'applicantName', v_applicant, 'requestId', new.id
    )
  );
  return new;
end;
$$;

create trigger join_requests_notify_received
  after insert on join_requests
  for each row execute function notify_join_request_received();

create or replace function notify_join_request_decided()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_name text;
begin
  if old.status = 'PENDING' and new.status in ('APPROVED', 'REJECTED') then
    select name into v_business_name from businesses where id = new.business_id;
    insert into notifications (profile_id, type, payload)
    values (
      new.profile_id, 'JOIN_REQUEST_DECIDED',
      jsonb_build_object(
        'businessId', new.business_id, 'businessName', v_business_name,
        'decision', new.status
      )
    );
  end if;
  return new;
end;
$$;

create trigger join_requests_notify_decided
  after update on join_requests
  for each row execute function notify_join_request_decided();

-- AFTER INSERT — a fresh appointment. Skipped for reschedule_appointment()'s insert half
-- (it sends its own APPOINTMENT_RESCHEDULED notice, 0007_fn_booking.sql) via the
-- transaction-local app.suppress_appt_notify flag. Recipient is the assigned employee —
-- the client already has the RPC's own response as confirmation (§8.4: notifications are
-- never the primary confirmation of anything).
create or replace function on_appointment_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient     uuid;
  v_business_name text;
  v_employee_name text;
  v_service_name  text;
  v_timezone      text;
begin
  if current_setting('app.suppress_appt_notify', true) = 'true' then
    return new;
  end if;

  select p.id, b.name, b.timezone, s.name, p.full_name
    into v_recipient, v_business_name, v_timezone, v_service_name, v_employee_name
    from employees e
    join businesses b on b.id = e.business_id
    join services  s on s.id = new.service_id
    join profiles  p on p.id = e.profile_id
   where e.id = new.employee_id;

  insert into notifications (profile_id, type, payload)
  values (
    v_recipient, 'APPOINTMENT_CREATED',
    jsonb_build_object(
      'appointmentId', new.id, 'businessName', v_business_name,
      'employeeName', v_employee_name, 'serviceName', v_service_name,
      'startsAt', lower(new.slot), 'timezone', v_timezone
    )
  );
  return new;
end;
$$;

create trigger appointments_after_insert
  after insert on appointments
  for each row execute function on_appointment_created();

-- AFTER UPDATE, PENDING -> CONFIRMED (approve_appointment(), or a fresh AUTO-policy booking
-- never passes through here since it's inserted CONFIRMED directly — this is specifically
-- the "someone just approved your pending request" notice).
create or replace function on_appointment_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_name text;
  v_employee_name text;
  v_service_name  text;
  v_timezone      text;
begin
  if not (old.status = 'PENDING' and new.status = 'CONFIRMED') then
    return new;
  end if;

  select b.name, b.timezone, s.name, p.full_name
    into v_business_name, v_timezone, v_service_name, v_employee_name
    from employees e
    join businesses b on b.id = e.business_id
    join services  s on s.id = new.service_id
    join profiles  p on p.id = e.profile_id
   where e.id = new.employee_id;

  insert into notifications (profile_id, type, payload)
  values (
    new.client_profile_id, 'APPOINTMENT_CONFIRMED',
    jsonb_build_object(
      'appointmentId', new.id, 'businessName', v_business_name,
      'employeeName', v_employee_name, 'serviceName', v_service_name,
      'startsAt', lower(new.slot), 'timezone', v_timezone
    )
  );
  return new;
end;
$$;

create trigger appointments_after_confirm
  after update on appointments
  for each row execute function on_appointment_confirmed();

-- AFTER UPDATE, -> CANCELLED. This is the one point every cancellation path passes through
-- — cancel_appointment(), reject_appointment(), and reschedule_appointment()'s cancel half
-- — so it is where the waitlist matcher (§6.7) is wired up, unconditionally. The
-- notification half is skipped when the calling RPC sends its own (reschedule, reject —
-- both set app.suppress_appt_notify); for a plain cancel_appointment() call it fires here,
-- addressed to whichever party did NOT perform the cancellation.
create or replace function on_appointment_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient      uuid;
  v_notif_type     notification_type;
  v_business_name  text;
  v_employee_name  text;
  v_service_name   text;
  v_timezone       text;
begin
  if new.status <> 'CANCELLED' or old.status = 'CANCELLED' then
    return new;   -- only a fresh transition INTO CANCELLED matters here
  end if;

  -- §6.7 — always re-offer the freed slot, regardless of what caused the cancellation
  perform match_waitlist_for_slot(new.employee_id, new.slot, new.service_id);

  if current_setting('app.suppress_appt_notify', true) = 'true' then
    return new;
  end if;

  select p.id, b.name, b.timezone, s.name, p.full_name
    into v_recipient, v_business_name, v_timezone, v_service_name, v_employee_name
    from employees e
    join businesses b on b.id = e.business_id
    join services  s on s.id = new.service_id
    join profiles  p on p.id = e.profile_id
   where e.id = new.employee_id;

  if new.cancelled_by = new.client_profile_id then
    -- the client cancelled their own appointment — tell the assigned employee
    v_notif_type := 'APPOINTMENT_CANCELLED';
    -- v_recipient already holds the assigned employee's profile id from the join above
  else
    -- staff/owner/admin acted — tell the client. A CANCELLED reached from PENDING via a
    -- plain cancel_appointment() call (not reject_appointment(), which self-notifies and
    -- is suppressed above) is treated the same as any other staff-initiated cancellation.
    v_recipient  := new.client_profile_id;
    v_notif_type := 'APPOINTMENT_CANCELLED';
  end if;

  insert into notifications (profile_id, type, payload)
  values (
    v_recipient, v_notif_type,
    jsonb_build_object(
      'appointmentId', new.id, 'businessName', v_business_name,
      'employeeName', v_employee_name, 'serviceName', v_service_name,
      'startsAt', lower(new.slot), 'timezone', v_timezone
    )
  );
  return new;
end;
$$;

create trigger appointments_after_cancel
  after update on appointments
  for each row execute function on_appointment_cancelled();

-- ============================================================================
-- 3. audit_log (§8.5: suspend, approve [join requests], resolve report, remove employee)
-- ============================================================================

create or replace function _write_audit_log(
  p_action    text,
  p_entity    text,
  p_entity_id uuid,
  p_metadata  jsonb default '{}'::jsonb
) returns void
language sql
security definer
set search_path = public
as $$
  insert into audit_log (actor_profile_id, action, entity, entity_id, metadata)
  values (auth.uid(), p_action, p_entity, p_entity_id, p_metadata);
$$;

create or replace function audit_business_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    perform _write_audit_log(
      case when new.status = 'SUSPENDED' then 'business.suspend' else 'business.unsuspend' end,
      'businesses', new.id, jsonb_build_object('previousStatus', old.status)
    );
  end if;
  return new;
end;
$$;

create trigger businesses_audit_status
  after update of status on businesses
  for each row execute function audit_business_status_change();

create or replace function audit_profile_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    perform _write_audit_log(
      case when new.status = 'SUSPENDED' then 'user.suspend' else 'user.unsuspend' end,
      'profiles', new.id, jsonb_build_object('previousStatus', old.status)
    );
  end if;
  return new;
end;
$$;

create trigger profiles_audit_status
  after update of status on profiles
  for each row execute function audit_profile_status_change();

create or replace function audit_employee_removed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform _write_audit_log('employee.remove', 'employees', old.id,
    jsonb_build_object('businessId', old.business_id, 'profileId', old.profile_id));
  return old;
end;
$$;

create trigger employees_audit_remove
  after delete on employees
  for each row execute function audit_employee_removed();

create or replace function audit_join_request_decided()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'PENDING' and new.status = 'APPROVED' then
    perform _write_audit_log('join_request.approve', 'join_requests', new.id,
      jsonb_build_object('businessId', new.business_id, 'profileId', new.profile_id));
  elsif old.status = 'PENDING' and new.status = 'REJECTED' then
    perform _write_audit_log('join_request.reject', 'join_requests', new.id,
      jsonb_build_object('businessId', new.business_id, 'profileId', new.profile_id));
  end if;
  return new;
end;
$$;

create trigger join_requests_audit_decided
  after update on join_requests
  for each row execute function audit_join_request_decided();

create or replace function audit_report_resolved()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'OPEN' and new.status in ('RESOLVED', 'DISMISSED') then
    perform _write_audit_log('report.resolve', 'reports', new.id,
      jsonb_build_object('outcome', new.status, 'resolutionNote', new.resolution_note));
  end if;
  return new;
end;
$$;

create trigger reports_audit_resolved
  after update on reports
  for each row execute function audit_report_resolved();
