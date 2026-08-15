-- match_waitlist_for_slot() + the cron expiry sweep (TECHNICAL_DESIGN.md §6.7), plus
-- claim_waitlist_entry() (§12.31, a gap found the same way approve/reject_appointment was,
-- §12.30 — the claim flow's write path has nowhere else to legally happen once RLS is on).
-- match_waitlist_for_slot() is CALLED by the AFTER UPDATE trigger on appointments wired up
-- in 0009_triggers.sql — this migration only defines the functions.

-- match_waitlist_for_slot() — event-driven, fires when an appointment's status flips to
-- CANCELLED (a cancel or the "cancel" half of a reschedule). Notifies EVERY eligible
-- ACTIVE entry at once (§12.15) rather than picking one: "the first to claim wins and the
-- rest get 409" is decided later, by the same exclusion constraint that decides every
-- other booking race — no reservation or lock is introduced here.
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

-- sweep_waitlist_expiry() — backs GET /api/cron/waitlist-expiry (§5.4, daily 03:00 UTC per
-- vercel.json). Returns counts for the endpoint's { expired, released } response.
create or replace function sweep_waitlist_expiry()
returns table (expired int, released int)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_expired          int;
  v_released         int := 0;
  v_entry            record;
  v_still_available  boolean;
begin
  -- §12.14 — ACTIVE entries past their requested window simply expire
  with updated as (
    update waitlist_entries
       set status = 'EXPIRED'
     where status = 'ACTIVE'
       and to_ts < now()
    returning id
  )
  select count(*) into v_expired from updated;

  -- §12.13/§12.29 — MATCHED entries past the 60-minute claim window. The schema does not
  -- record which specific slot/employee an entry was matched to (only matched_at, §12.11)
  -- — the WAITLIST_MATCHED notification is that record, and the claim endpoint trusts it,
  -- re-validated by book_appointment(). So "is a slot still open" here is re-derived across
  -- every employee/service the entry was originally eligible for, over its original
  -- [from_ts, to_ts) window — not a single remembered slot (§12.29 spells out why).
  for v_entry in
    select we.id, we.service_id, we.from_ts, we.to_ts, we.business_id
      from waitlist_entries we
     where we.status = 'MATCHED'
       and we.matched_at < now() - interval '60 minutes'
  loop
    select exists (
      select 1
        from employees e
        join services s on s.employee_id = e.id and s.status = 'ACTIVE'
       where e.business_id = v_entry.business_id
         and e.status = 'ACTIVE'
         and (v_entry.service_id is null or s.id = v_entry.service_id)
         and (
           not exists (select 1 from waitlist_employee_targets t where t.waitlist_entry_id = v_entry.id)
           or exists (
             select 1 from waitlist_employee_targets t
              where t.waitlist_entry_id = v_entry.id and t.employee_id = e.id
           )
         )
         and exists (
           select 1 from get_available_slots(e.id, s.id, greatest(v_entry.from_ts, now()), v_entry.to_ts)
         )
    ) into v_still_available;

    if v_still_available then
      update waitlist_entries set status = 'ACTIVE' where id = v_entry.id;
      v_released := v_released + 1;
    else
      update waitlist_entries set status = 'EXPIRED' where id = v_entry.id;
    end if;
  end loop;

  return query select v_expired, v_released;
end;
$$;

-- claim_waitlist_entry() [+] §12.31 — POST /api/waitlist/[id]/claim's backing RPC (§4.4:
-- "→ same RPC" meaning book_appointment(), but something has to also flip the waitlist
-- entry MATCHED→CLAIMED on success, or MATCHED→ACTIVE on a lost race (§6.9: "second gets
-- 409, its entry returns to ACTIVE") — and per RLS (0010_rls.sql), waitlist_entries has no
-- client-facing UPDATE policy at all (status changes are matcher/cron/claim-driven only),
-- so that bookkeeping needs a security-definer RPC same as approve/reject_appointment did
-- for appointments (§12.30). p_service_id is accepted explicitly because the entry itself
-- may have none (`service_id is null` = "any service") — the concrete service being
-- claimed is only known from the WAITLIST_MATCHED notification that drove the client here.
create or replace function claim_waitlist_entry(
  p_waitlist_entry_id uuid,
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
  v_entry waitlist_entries%rowtype;
  v_appt  appointments%rowtype;
begin
  select * into v_entry from waitlist_entries where id = p_waitlist_entry_id;
  if v_entry.id is null then
    raise exception 'not_found' using errcode = '23503';
  end if;

  if v_entry.client_profile_id <> p_actor_profile_id then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  if v_entry.status <> 'MATCHED' then
    raise exception 'match_expired';   -- §5.4: 410 Gone
  end if;

  begin
    v_appt := book_appointment(p_actor_profile_id, p_employee_id, p_service_id, p_starts_at,
                                p_actor_profile_id);
  exception when others then
    -- first claimer already won (409) or the match went stale (422) — release this entry
    -- back to ACTIVE immediately rather than waiting up to 60 minutes for the cron sweep,
    -- then re-raise so the caller still sees the original error
    update waitlist_entries set status = 'ACTIVE' where id = p_waitlist_entry_id;
    raise;
  end;

  update waitlist_entries set status = 'CLAIMED' where id = p_waitlist_entry_id;
  return v_appt;
end;
$$;
