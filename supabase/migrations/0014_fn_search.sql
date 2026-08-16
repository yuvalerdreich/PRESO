-- get_next_available() — the "sort by next available" half of search (TECHNICAL_DESIGN.md §6.6).
--
-- §5.2's `BusinessSearchResult.nextAvailableAt` and `sort=nextAvailable` were specified from the
-- start but this function was never written; `GET /api/businesses` cannot implement its documented
-- contract without it. Added here rather than in 0006 so the availability engine's own migration
-- and its pgTAP file stay untouched.
--
-- Availability is computed, never stored (§2), so "the earliest bookable time at this business"
-- has no column to read — it is get_available_slots() evaluated across every ACTIVE
-- employee × ACTIVE service pair and minimised. That is O(employees × services) per business,
-- which §12.8 flags as the one endpoint whose cost the schema does not bound. Two things keep it
-- honest, and both live here rather than in the caller so a future caller cannot forget them:
--
--   1. The horizon is hard-capped at 14 days regardless of what p_to says.
--   2. Each pair is searched only up to the best time found so far, so every hit shrinks the
--      window the remaining pairs have to slice. Pairs are visited shortest-duration first,
--      which tends to find an early slot on the first pass and prune the rest hard.
--
-- The route handler additionally evaluates this only for the current result page (≤ 20 rows).
create or replace function get_next_available(
  p_business_id   uuid,
  p_from          timestamptz,
  p_to            timestamptz,
  p_service_query text default null,
  p_hour_from     time default null,
  p_hour_to       time default null
) returns timestamptz
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business  businesses%rowtype;
  v_tz        text;
  v_from      timestamptz;
  v_to        timestamptz;
  v_pair      record;
  v_slot      timestamptz;
  v_best      timestamptz := null;
  v_local     time;
begin
  select * into v_business from businesses where id = p_business_id;

  -- A suspended business is hidden from search entirely (§6.9), so it has no next available
  -- time rather than an empty one.
  if v_business.id is null or v_business.status <> 'ACTIVE' then
    return null;
  end if;

  v_tz := v_business.timezone;

  -- Never look backwards, and never past the 14-day horizon §12.8 fixes.
  v_from := greatest(p_from, now());
  v_to   := least(p_to, v_from + interval '14 days');

  if v_to <= v_from then
    return null;
  end if;

  for v_pair in
    select s.id as service_id, e.id as employee_id
      from employees e
      join services  s on s.employee_id = e.id
     where e.business_id = p_business_id
       and e.status = 'ACTIVE'
       and s.status = 'ACTIVE'
       -- §5.2's `serviceQ` filter. Applied inside the loop rather than by the caller so a
       -- business only "has availability" via a service the client actually searched for.
       and (p_service_query is null or s.name ilike '%' || p_service_query || '%')
     -- Shortest service first: it is both the cheapest to slice and the likeliest to fit.
     order by s.duration_minutes
  loop
    -- Search only up to the best time found so far: a later slot from this pair cannot improve
    -- on it, so there is no reason to compute one.
    for v_slot in
      select starts_at
        from get_available_slots(v_pair.employee_id, v_pair.service_id, v_from, coalesce(v_best, v_to))
       order by starts_at
    loop
      -- §5.2's `hourFrom`/`hourTo` narrow by wall-clock time in the business's own zone — a
      -- client asking for "evenings" means evenings where the business is, not in UTC.
      v_local := (v_slot at time zone v_tz)::time;

      if (p_hour_from is null or v_local >= p_hour_from)
         and (p_hour_to is null or v_local < p_hour_to)
      then
        if v_best is null or v_slot < v_best then
          v_best := v_slot;
        end if;
        -- Slots arrive ordered, so the first match for this pair is its best; no later slot
        -- from the same pair can improve on it.
        exit;
      end if;
    end loop;
  end loop;

  return v_best;
end;
$$;
