-- get_available_slots() — the availability engine (TECHNICAL_DESIGN.md §6.1). The single
-- most important function in the system: availability is DERIVED here, never stored.
--
--   bookable slots = business_hours ∩ employee_availability_rules − appointments,
--                     sliced by service.duration_minutes (+ buffer)
--
-- _range_diff() is a private implementation helper (not part of the documented RPC
-- surface — TECHNICAL_DESIGN.md's function list is get_available_slots/book_appointment/
-- cancel_appointment/reschedule_appointment/match_waitlist_for_slot). It computes
-- `base - cut` for two tstzranges, returning 0, 1 or 2 pieces — Postgres's built-in `-`
-- range operator refuses when the difference isn't a single contiguous range (i.e. when
-- `cut` sits strictly inside `base`), which is exactly the case a VACATION/BLOCK rule in
-- the middle of a window needs to produce.
create or replace function _range_diff(base tstzrange, cut tstzrange)
returns setof tstzrange
language sql
immutable
as $$
  select r from (values
    (case when not (base && cut)        then base
          when lower(base) < lower(cut) then tstzrange(lower(base), lower(cut), '[)')
          else null end),
    (case when not (base && cut)        then null   -- avoid re-emitting base from both branches
          when upper(base) > upper(cut) then tstzrange(upper(cut), upper(base), '[)')
          else null end)
  ) as pieces(r)
  where r is not null and not isempty(r);
$$;

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
  v_exception     employee_availability_rules%rowtype;
  v_has_exception boolean;
  v_tz            text;
  v_duration      interval;
  v_buffer        interval;
  v_req_range     tstzrange;
  v_date          date;
  v_end_date      date;
  v_dow           smallint;
  v_day_range     tstzrange;
  v_bw            tstzrange[];
  v_ew            tstzrange[];
  v_open          tstzrange[];
  v_next_open     tstzrange[];
  v_blocks        tstzrange[];
  v_busy          tstzrange[];
  v_window        tstzrange;
  v_ewin          tstzrange;
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
    v_dow := extract(dow from v_date);   -- 0 = Sunday, matches business_hours.day_of_week
    v_day_range := tstzrange(
      (v_date)::timestamp     at time zone v_tz,
      (v_date + 1)::timestamp at time zone v_tz,
      '[)'
    );

    -- §6.1 step 4 — business_hours windows for this day of week
    select coalesce(array_agg(
             tstzrange((v_date + bh.opens_at)  at time zone v_tz,
                        (v_date + bh.closes_at) at time zone v_tz, '[)')
           ), '{}')
      into v_bw
      from business_hours bh
     where bh.business_id = v_business.id
       and bh.day_of_week = v_dow;

    -- §6.1 step 5 — an EXCEPTION *replaces* the weekly window for the dates it covers,
    -- it never adds to it. At most one is expected to cover a given day.
    select * into v_exception
      from employee_availability_rules
     where employee_id = p_employee_id
       and kind = 'EXCEPTION'
       and effective_range && v_day_range
     order by created_at
     limit 1;
    v_has_exception := found;

    if v_has_exception then
      v_ew := array[ tstzrange((v_date + v_exception.starts_at) at time zone v_tz,
                                (v_date + v_exception.ends_at)   at time zone v_tz, '[)') ];
    else
      select coalesce(array_agg(
               tstzrange((v_date + ear.starts_at) at time zone v_tz,
                          (v_date + ear.ends_at)   at time zone v_tz, '[)')
             ), '{}')
        into v_ew
        from employee_availability_rules ear
       where ear.employee_id = p_employee_id
         and ear.kind = 'WEEKLY_WINDOW'
         and ear.day_of_week = v_dow;
    end if;

    -- §6.1 step 6 — OPEN := business windows ∩ employee windows (business hours are the
    -- outer boundary). Native range intersection (`*`) is exact once we know they overlap.
    v_open := '{}';
    foreach v_window in array v_bw loop
      foreach v_ewin in array v_ew loop
        if v_window && v_ewin then
          v_open := v_open || (v_window * v_ewin);
        end if;
      end loop;
    end loop;

    if array_length(v_open, 1) > 0 then
      -- §6.1 step 7 — OPEN minus every VACATION/BLOCK effective_range touching this day
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
      -- §6.1 step 8 — BUSY: this employee's live appointments touching this day, each
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

      -- §6.1 step 9 — pack slots back-to-back from each window's start,
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
