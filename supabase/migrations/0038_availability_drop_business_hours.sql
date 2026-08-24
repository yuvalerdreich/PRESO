-- §12.x — business_hours is dropped from the availability engine entirely.
--
-- Its editor was removed from the app on 2026-08-21 (§12.67: "I don't need a component that
-- limits my shift hours generally too") but get_available_slots() was never updated to match —
-- it still intersected every employee's weekly/date windows against whatever business_hours rows
-- happened to be sitting in the table (§6.1 step 6, "business hours are the outer boundary").
-- With no editor left anywhere in the app, that intersection was pure leftover state: a business
-- could be constrained by rows nobody could see, edit, or clear, and the hours screen's "shift
-- exceeds opening hours" warning — correct at the time — became a report of a problem with no fix.
--
-- Decided: the employee's own weekly pattern and date overrides are now the sole source of truth
-- for what is bookable. business_hours the table is left in place (dropping it is a separate,
-- unnecessary risk — nothing reads it anymore, so any rows still in it are inert), but nothing in
-- the engine consults it from this migration on. `setOperatingHours` and everything that wrote to
-- it are removed in the same pass (src/server/actions/business.ts) since a write path with no
-- reader is exactly the kind of dead code CLAUDE.md says to delete outright, not leave orphaned.
--
-- Restated in full (`create or replace function` takes a whole body); the only structural change
-- from 0026 is that step 4 (business_hours windows) and step 6's intersection are gone — OPEN is
-- now simply the employee's own windows, subject to the same VACATION/BLOCK subtraction, request
-- clipping and busy-check as before. Every existing pgTAP assertion in 0002_availability.test.sql
-- keeps passing unchanged: every fixture there set business_hours wide enough to never actually be
-- the constraining factor, so removing it from the computation cannot narrow any of their results.

create or replace function get_available_slots(
  p_employee_id uuid,
  p_service_id  uuid,
  p_from        timestamptz,
  p_to          timestamptz
) returns table (starts_at timestamptz, ends_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_service       services%rowtype;
  v_employee      employees%rowtype;
  v_business      businesses%rowtype;
  v_tz            text;
  v_duration      interval;
  v_buffer        interval;
  v_req_range     tstzrange;
  v_date          date;
  v_end_date      date;
  v_dow           smallint;
  v_day_range     tstzrange;
  v_ew            tstzrange[];
  v_open          tstzrange[];
  v_next_open     tstzrange[];
  v_blocks        tstzrange[];
  v_busy          tstzrange[];
  v_window        tstzrange;
  v_block         tstzrange;
  v_piece         tstzrange;
  v_t             timestamptz;
  v_guard         tstzrange;
begin
  -- §6.1 step 1 — load service, employee, business
  select * into v_service  from services  where id = p_service_id;
  select * into v_employee from employees where id = p_employee_id;
  if v_employee.id is not null then
    select * into v_business from businesses where id = v_employee.business_id;
  end if;

  -- §6.1 step 2 — GUARD: zero rows if any holds. The route handler (§5.3) turns
  -- "zero rows + a failing guard" into 422 so the UI can explain why.
  if v_service.id is null
     or v_employee.id is null
     or v_business.id is null
     or v_service.employee_id <> p_employee_id
     or v_service.status <> 'ACTIVE'
     or v_employee.status <> 'ACTIVE'
     or v_business.status <> 'ACTIVE'
  then
    return;
  end if;

  v_tz        := v_business.timezone;
  v_duration  := make_interval(mins => v_service.duration_minutes);
  v_buffer    := make_interval(mins => v_service.buffer_minutes);
  v_req_range := tstzrange(p_from, p_to, '[)');

  -- §6.1 step 3 — one local date at a time, in the business's timezone (DST-safe: all
  -- arithmetic goes through `AT TIME ZONE`, never `+ interval '24 hours'` on a local date)
  v_date     := (p_from at time zone v_tz)::date;
  v_end_date := (p_to   at time zone v_tz)::date;

  while v_date <= v_end_date loop
    v_dow := extract(dow from v_date);
    v_day_range := tstzrange(
      (v_date)::timestamp     at time zone v_tz,
      (v_date + 1)::timestamp at time zone v_tz,
      '[)'
    );

    -- §6.1 step 4 (was step 5) — EXCEPTION rules *replace* the weekly pattern for the dates they
    -- cover; they never add to it. All of a day's exceptions apply together (0022). §12.68: a
    -- window tagged to a different service is excluded outright, same as if that row didn't exist
    -- for this request.
    select coalesce(array_agg(
             tstzrange((v_date + ear.starts_at) at time zone v_tz,
                        (v_date + ear.ends_at)   at time zone v_tz, '[)')
             order by ear.starts_at
           ), '{}')
      into v_ew
      from employee_availability_rules ear
     where ear.employee_id = p_employee_id
       and ear.kind = 'EXCEPTION'
       and ear.effective_range && v_day_range
       and (ear.service_id is null or ear.service_id = p_service_id);

    -- No exception covers this day, so the weekly pattern stands.
    if array_length(v_ew, 1) is null then
      select coalesce(array_agg(
               tstzrange((v_date + ear.starts_at) at time zone v_tz,
                          (v_date + ear.ends_at)   at time zone v_tz, '[)')
             ), '{}')
        into v_ew
        from employee_availability_rules ear
       where ear.employee_id = p_employee_id
         and ear.kind = 'WEEKLY_WINDOW'
         and ear.day_of_week = v_dow
         and (ear.service_id is null or ear.service_id = p_service_id);
    end if;

    -- §6.1 step 5 (was step 6) — OPEN := the employee's own windows. business_hours no longer
    -- takes part (this migration's whole point); the employee's weekly/date windows are now the
    -- only boundary.
    v_open := v_ew;

    if array_length(v_open, 1) > 0 then
      -- §6.1 step 6 (was step 7) — OPEN minus every VACATION/BLOCK effective_range touching this
      -- day. Never service-filtered: a block subtracts time from every service alike.
      select coalesce(array_agg(effective_range), '{}')
        into v_blocks
        from employee_availability_rules
       where employee_id = p_employee_id
         and kind in ('VACATION', 'BLOCK')
         and effective_range && v_day_range;

      foreach v_block in array v_blocks loop
        v_next_open := '{}';
        foreach v_window in array v_open loop
          for v_piece in select * from _range_diff(v_window, v_block) loop
            v_next_open := v_next_open || v_piece;
          end loop;
        end loop;
        v_open := v_next_open;
      end loop;

      -- clip to the caller's requested [p_from, p_to) window
      v_next_open := '{}';
      foreach v_window in array v_open loop
        if v_window && v_req_range then
          v_next_open := v_next_open || (v_window * v_req_range);
        end if;
      end loop;
      v_open := v_next_open;
    end if;

    if array_length(v_open, 1) > 0 then
      -- §6.1 step 7 (was step 8) — BUSY: this employee's live appointments touching this day, each
      -- padded by *its own* service's buffer (buffer applies on both sides, §6.1 notes)
      select coalesce(array_agg(
               tstzrange(lower(a.slot),
                         upper(a.slot) + make_interval(mins => s2.buffer_minutes), '[)')
             ), '{}')
        into v_busy
        from appointments a
        join services s2 on s2.id = a.service_id
       where a.employee_id = p_employee_id
         and a.status <> 'CANCELLED'
         and a.slot && v_day_range;

      -- §6.1 step 8 (was step 9) — pack slots back-to-back from each window's start,
      -- step = duration + buffer
      foreach v_window in array v_open loop
        v_t := lower(v_window);
        while v_t + v_duration <= upper(v_window) loop
          v_guard := tstzrange(v_t, v_t + v_duration + v_buffer, '[)');
          if v_t >= now()
             and not exists (select 1 from unnest(v_busy) as b(rng) where b.rng && v_guard)
          then
            starts_at := v_t;
            ends_at   := v_t + v_duration;
            return next;
          end if;
          v_t := v_t + v_duration + v_buffer;
        end loop;
      end loop;
    end if;

    v_date := v_date + 1;
  end loop;

  return;
end;
$$;
