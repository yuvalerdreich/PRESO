-- get_available_slots() — the availability engine (TECHNICAL_DESIGN.md §6.1). Same
-- scenarios verified by hand while building 0006_fn_availability.sql, now committed so a
-- future change to the packing/subtraction logic can't regress silently.
begin;
select plan(16);

-- profiles are auto-created by handle_new_user() (0009_triggers.sql) from this metadata —
-- no separate insert into profiles needed, or wanted (it would conflict with the trigger).
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'owner-avail@test.local', '{"account_type":"BUSINESS","full_name":"Owner"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000a6', 'client-avail@test.local', '{"account_type":"CLIENT","full_name":"Client"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000a8', 'other-staff-avail@test.local', '{"account_type":"BUSINESS","full_name":"Other Staff"}'::jsonb);
insert into categories (id, name, slug) values ('00000000-0000-0000-0000-0000000000a2', 'Barbers', 'barbers-avail');
insert into businesses (id, owner_profile_id, name, category_id, address, area, phone, timezone) values
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000a1',
   'Test Barbershop', '00000000-0000-0000-0000-0000000000a2', '1 Test St', 'Tel Aviv',
   '+972500000000', 'Asia/Jerusalem');
-- Tuesday 2026-09-01 (dow=2): business hours 09:00-17:00; Wednesday 2026-09-02 (dow=3): wide open
insert into business_hours (business_id, day_of_week, opens_at, closes_at) values
  ('00000000-0000-0000-0000-0000000000a3', 2, '09:00', '17:00'),
  ('00000000-0000-0000-0000-0000000000a3', 3, '08:00', '20:00');
insert into employees (id, business_id, profile_id, position_title) values
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a3',
   '00000000-0000-0000-0000-0000000000a1', 'Barber');
insert into employee_availability_rules (employee_id, kind, day_of_week, starts_at, ends_at) values
  ('00000000-0000-0000-0000-0000000000a4', 'WEEKLY_WINDOW', 2, '09:00', '17:00');
insert into services (id, employee_id, name, price, duration_minutes, buffer_minutes) values
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-0000000000a4', 'Haircut', 50.00, 30, 10);

-- test 1: plain weekly window, no bookings — 12 slots, back-to-back at duration+buffer=40min,
-- exact set verified (not just a count) since this is the base case everything else builds on
select results_eq(
  $$ select starts_at from get_available_slots(
       '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5',
       '2026-09-01T00:00:00+03', '2026-09-01T23:59:59+03'
     ) order by starts_at $$,
  $$ select generate_series(
       '2026-09-01T09:00:00+03'::timestamptz, '2026-09-01T16:20:00+03'::timestamptz, interval '40 minutes'
     ) $$,
  'plain weekly window: 12 back-to-back slots, 09:00 to 16:20 local'
);

-- test 2: a booked 10:00-10:30 appointment, buffer-expanded, knocks out its own slot plus
-- the two neighbours whose guard window overlaps it (09:40 and 10:20 local)
insert into appointments (client_profile_id, employee_id, service_id, slot, status, created_by) values
  ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-0000000000a4',
   '00000000-0000-0000-0000-0000000000a5',
   tstzrange('2026-09-01T10:00:00+03', '2026-09-01T10:30:00+03', '[)'), 'CONFIRMED',
   '00000000-0000-0000-0000-0000000000a6');
select is(
  (select count(*)::int from get_available_slots(
     '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5',
     '2026-09-01T00:00:00+03', '2026-09-01T23:59:59+03')),
  10,
  'booking one slot removes it and both buffer-adjacent neighbours: 12 -> 10'
);
select is(
  (select count(*)::int from get_available_slots(
     '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5',
     '2026-09-01T00:00:00+03', '2026-09-01T23:59:59+03')
   where starts_at in ('2026-09-01T09:40:00+03', '2026-09-01T10:20:00+03')),
  0,
  'the buffer-adjacent neighbours specifically are gone, not some other two slots'
);

-- test 3: a lunch BLOCK splits the single window into two independently-packed windows
insert into employee_availability_rules (employee_id, kind, effective_range) values
  ('00000000-0000-0000-0000-0000000000a4', 'BLOCK',
   tstzrange('2026-09-01T12:00:00+03', '2026-09-01T13:00:00+03', '[)'));
select is(
  (select count(*)::int from get_available_slots(
     '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5',
     '2026-09-01T00:00:00+03', '2026-09-01T23:59:59+03')),
  8,
  'a BLOCK over lunch splits the window and re-packs each half independently: 10 -> 8'
);

-- test 4: an EXCEPTION replaces the day's availability even with no WEEKLY_WINDOW at all
insert into employee_availability_rules (employee_id, kind, effective_range, starts_at, ends_at) values
  ('00000000-0000-0000-0000-0000000000a4', 'EXCEPTION',
   tstzrange('2026-09-02T00:00:00+03', '2026-09-03T00:00:00+03', '[)'), '10:00', '12:00');
select is(
  (select count(*)::int from get_available_slots(
     '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5',
     '2026-09-02T00:00:00+03', '2026-09-02T23:59:59+03')),
  3,
  'EXCEPTION 10:00-12:00 on a day with no WEEKLY_WINDOW: 3 slots (10:00, 10:40, 11:20)'
);

-- test 4b (0022): a *second* EXCEPTION on the same date is honoured, not silently ignored.
-- This is what a split shift is — morning and evening on one day — and the old `limit 1` read of
-- the day's exception dropped whichever row lost the created_at race.
insert into employee_availability_rules (employee_id, kind, effective_range, starts_at, ends_at) values
  ('00000000-0000-0000-0000-0000000000a4', 'EXCEPTION',
   tstzrange('2026-09-02T00:00:00+03', '2026-09-03T00:00:00+03', '[)'), '16:00', '18:00');
select is(
  (select count(*)::int from get_available_slots(
     '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5',
     '2026-09-02T00:00:00+03', '2026-09-02T23:59:59+03')),
  6,
  'two EXCEPTIONs on one date both apply: 3 slots in each of 10:00-12:00 and 16:00-18:00'
);

-- ...and they still *replace* the weekly pattern rather than adding to it: the weekly window for
-- this weekday is untouched above, and nothing outside the two exception windows is bookable.
select is(
  (select count(*)::int from get_available_slots(
     '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5',
     '2026-09-02T12:00:00+03', '2026-09-02T16:00:00+03')),
  0,
  'the gap between two exception windows stays closed — exceptions replace the weekly pattern'
);

-- test 4c: the case the schedule screen exists for — a date-specific change to a weekday that
-- *does* have a weekly window. Tuesdays are 09:00-17:00 weekly; this one Tuesday is 13:00-15:00.
-- The exception must win outright: three slots inside it, and nothing at all in the morning the
-- weekly pattern would otherwise open.
insert into employee_availability_rules (employee_id, kind, effective_range, starts_at, ends_at) values
  ('00000000-0000-0000-0000-0000000000a4', 'EXCEPTION',
   tstzrange('2026-09-08T00:00:00+03', '2026-09-09T00:00:00+03', '[)'), '13:00', '15:00');
select results_eq(
  $$ select starts_at from get_available_slots(
       '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5',
       '2026-09-08T00:00:00+03', '2026-09-08T23:59:59+03'
     ) order by starts_at $$,
  $$ select generate_series(
       '2026-09-08T13:00:00+03'::timestamptz, '2026-09-08T14:20:00+03'::timestamptz, interval '40 minutes'
     ) $$,
  'a date EXCEPTION overrides the WEEKLY_WINDOW of that weekday: only 13:00-15:00 is bookable'
);
-- ...and the untouched Tuesday a week earlier still runs on the weekly pattern, so the override is
-- scoped to its own date rather than to the weekday.
select is(
  (select count(*)::int from get_available_slots(
     '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5',
     '2026-09-15T00:00:00+03', '2026-09-15T23:59:59+03')),
  12,
  'the following Tuesday, with no exception of its own, still runs 09:00-17:00 weekly'
);

-- test 5: guards — a suspended business, service, or employee all yield zero rows, not an error
update businesses set status = 'SUSPENDED' where id = '00000000-0000-0000-0000-0000000000a3';
select is(
  (select count(*)::int from get_available_slots(
     '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5',
     '2026-09-01T00:00:00+03', '2026-09-01T23:59:59+03')),
  0,
  'a suspended business returns zero rows, not an error'
);
update businesses set status = 'ACTIVE' where id = '00000000-0000-0000-0000-0000000000a3';

update services set status = 'INACTIVE' where id = '00000000-0000-0000-0000-0000000000a5';
select is(
  (select count(*)::int from get_available_slots(
     '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5',
     '2026-09-01T00:00:00+03', '2026-09-01T23:59:59+03')),
  0,
  'an INACTIVE service returns zero rows'
);
update services set status = 'ACTIVE' where id = '00000000-0000-0000-0000-0000000000a5';

update employees set status = 'INACTIVE' where id = '00000000-0000-0000-0000-0000000000a4';
select is(
  (select count(*)::int from get_available_slots(
     '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5',
     '2026-09-01T00:00:00+03', '2026-09-01T23:59:59+03')),
  0,
  'an INACTIVE employee returns zero rows'
);
update employees set status = 'ACTIVE' where id = '00000000-0000-0000-0000-0000000000a4';

-- a service that belongs to a DIFFERENT employee than the one passed in must also guard out
insert into employees (id, business_id, profile_id, position_title) values
  ('00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a3',
   '00000000-0000-0000-0000-0000000000a8', 'Other Barber');
select is(
  (select count(*)::int from get_available_slots(
     '00000000-0000-0000-0000-0000000000a7', '00000000-0000-0000-0000-0000000000a5',
     '2026-09-01T00:00:00+03', '2026-09-01T23:59:59+03')),
  0,
  'a service not owned by the given employee returns zero rows'
);

-- test 6 (§12.68): a window tagged to one specific service offers only that service — everyone
-- else sees nothing there, as if the row didn't exist for them. An untagged window is unaffected
-- and keeps applying to every service, including one that didn't exist when it was created.
insert into services (id, employee_id, name, price, duration_minutes, buffer_minutes) values
  ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000a4', 'Massage', 80.00, 45, 15);

-- Wednesday 2026-09-09: wide-open business hours, no WEEKLY_WINDOW or EXCEPTION for this weekday
-- yet, and no exception on this specific date — a clean day to isolate the new column's effect on.
insert into employee_availability_rules (employee_id, kind, day_of_week, starts_at, ends_at, service_id) values
  ('00000000-0000-0000-0000-0000000000a4', 'WEEKLY_WINDOW', 3, '13:00', '14:00',
   '00000000-0000-0000-0000-0000000000a5');
select results_eq(
  $$ select starts_at from get_available_slots(
       '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a5',
       '2026-09-09T00:00:00+03', '2026-09-09T23:59:59+03'
     ) order by starts_at $$,
  $$ values ('2026-09-09T13:00:00+03'::timestamptz) $$,
  'a window tagged to Haircut is bookable as Haircut: one 30+10min slot fits in 13:00-14:00'
);
select is(
  (select count(*)::int from get_available_slots(
     '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a9',
     '2026-09-09T00:00:00+03', '2026-09-09T23:59:59+03')),
  0,
  'the same window is invisible to Massage — tagged to a different service, not just any window'
);
select is(
  (select count(*)::int from get_available_slots(
     '00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-0000000000a9',
     '2026-09-01T00:00:00+03', '2026-09-01T23:59:59+03')) > 0,
  true,
  'an untagged window (Tuesday, from test 1) still applies to Massage, a service created after it'
);

select * from finish();
rollback;
