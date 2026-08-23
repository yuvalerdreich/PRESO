-- Part of the Resend → in-app notification bell switch (see the new §12.x entry in
-- TECHNICAL_DESIGN.md). Three unrelated pieces bundled in one migration because they are all
-- needed together for the bell to work, and none of them touches an enum (0030 already committed
-- separately for that reason):
--   1. a reminder sweep, so "24h before any appointment" has something writing the new type
--   2. WAITLIST_MATCHED gains businessId, so the notification can link straight to the booking
--      screen without an extra lookup
--   3. Realtime is enabled on notifications, so the bell's unread badge updates live

-- ============================================================================
-- 1. Appointment reminders
-- ============================================================================

-- Idempotency marker, same pattern as notifications.emailed_at / waitlist_entries.matched_at:
-- a sweep can run more than once and must not remind the same appointment twice.
alter table appointments add column reminder_sent_at timestamptz null;

-- sweep_appointment_reminders() — backs GET /api/cron/appointment-reminders, cron-driven
-- (vercel.json, daily). Vercel's free-tier cron only runs once a day, so "24 hours before" is
-- implemented as a 24h-wide catch window one day ahead rather than a precise T-minus-24h fire:
-- every CONFIRMED appointment passes through exactly one daily run before it happens, and
-- reminder_sent_at makes a second run over the same appointment a no-op regardless of exactly
-- when in that window the cron happened to fire.
create or replace function sweep_appointment_reminders()
returns table (reminded int)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_reminded int := 0;
  v_appt     record;
begin
  for v_appt in
    select a.id, a.client_profile_id, a.employee_id, a.service_id, a.slot
      from appointments a
     where a.status = 'CONFIRMED'
       and a.reminder_sent_at is null
       and lower(a.slot) >= now() + interval '24 hours'
       and lower(a.slot) <  now() + interval '48 hours'
  loop
    declare
      v_business_name text;
      v_employee_name text;
      v_service_name  text;
      v_timezone      text;
    begin
      select b.name, b.timezone, s.name, p.full_name
        into v_business_name, v_timezone, v_service_name, v_employee_name
        from employees e
        join businesses b on b.id = e.business_id
        join services  s on s.id = v_appt.service_id
        join profiles  p on p.id = e.profile_id
       where e.id = v_appt.employee_id;

      insert into notifications (profile_id, type, payload)
      values (
        v_appt.client_profile_id, 'APPOINTMENT_REMINDER',
        jsonb_build_object(
          'appointmentId', v_appt.id, 'businessName', v_business_name,
          'employeeName', v_employee_name, 'serviceName', v_service_name,
          'startsAt', lower(v_appt.slot), 'timezone', v_timezone
        )
      );

      update appointments set reminder_sent_at = now() where id = v_appt.id;
      v_reminded := v_reminded + 1;
    end;
  end loop;

  return query select v_reminded;
end;
$$;

-- ============================================================================
-- 2. WAITLIST_MATCHED gains businessId
-- ============================================================================

-- Restated from 0008_fn_waitlist.sql, whole body required by `create or replace function`.
-- Only change: 'businessId', v_business_id added to the notification payload — v_business_id was
-- already resolved into scope for the eligibility query, this just also puts it in the payload so
-- the bell can link to /b/{businessId}/e/{employeeId}/s/{serviceId} without a lookup.
create or replace function match_waitlist_for_slot(
  p_employee_id uuid,
  p_freed_slot  tstzrange,
  p_service_id  uuid
) returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_business_id   uuid;
  v_business_name text;
  v_timezone      text;
  v_service_name  text;
  v_still_open    boolean;
  v_entry         record;
begin
  select e.business_id, b.name, b.timezone
    into v_business_id, v_business_name, v_timezone
    from employees e
    join businesses b on b.id = e.business_id
   where e.id = p_employee_id;

  if v_business_id is null then
    return;
  end if;

  select name into v_service_name from services where id = p_service_id;

  -- the slot may already be gone by the time this fires (RE-CONFIRM, §6.7). It is the
  -- same employee/service/instant for every candidate below, so one check suffices.
  select exists (
    select 1 from get_available_slots(p_employee_id, p_service_id, lower(p_freed_slot), upper(p_freed_slot))
     where starts_at = lower(p_freed_slot)
  ) into v_still_open;

  if not v_still_open then
    return;
  end if;

  for v_entry in
    select we.id, we.client_profile_id
      from waitlist_entries we
     where we.status = 'ACTIVE'
       and we.business_id = v_business_id
       and (we.service_id is null or we.service_id = p_service_id)
       and tstzrange(we.from_ts, we.to_ts) && p_freed_slot
       and (
         not exists (select 1 from waitlist_employee_targets t where t.waitlist_entry_id = we.id)
         or exists (
           select 1 from waitlist_employee_targets t
            where t.waitlist_entry_id = we.id and t.employee_id = p_employee_id
         )
       )
     order by we.created_at   -- fairness: longest waiting first (display/documentation only —
                               -- every eligible entry below is matched, none are skipped)
  loop
    update waitlist_entries
       set status = 'MATCHED', matched_at = now()
     where id = v_entry.id;

    insert into notifications (profile_id, type, payload)
    values (
      v_entry.client_profile_id,
      'WAITLIST_MATCHED',
      jsonb_build_object(
        'waitlistEntryId', v_entry.id,
        'businessId',      v_business_id,   -- [+] lets the bell link straight to the booking screen
        'businessName',    v_business_name,
        'employeeId',      p_employee_id,
        'serviceId',       p_service_id,   -- [+] §12.31: claim_waitlist_entry() needs this;
                                            -- the documented NotificationPayload (§3.11) and
                                            -- claim request body (§5.4) both omit it
        'serviceName',     v_service_name,
        'startsAt',        lower(p_freed_slot),
        'timezone',        v_timezone,
        'claimExpiresAt',  now() + interval '60 minutes'   -- §12.13
      )
    );
  end loop;
end;
$$;

-- ============================================================================
-- 3. Realtime, so the bell's unread badge updates live
-- ============================================================================

-- Not enabled on any table before this. RLS (notifications_select: own row or admin) still
-- applies to postgres_changes subscriptions, so this doesn't widen who can see what.
alter publication supabase_realtime add table notifications;
