-- get_next_available() — the search endpoint's availability sort (TECHNICAL_DESIGN.md §6.6,
-- migration 0014_fn_search.sql).
--
-- Unlike 0002_availability.test.sql, every date here is **relative to now()**. The function
-- hard-caps its horizon at 14 days from the current time (§12.8), so a fixture pinned to a
-- literal date would start passing or failing depending on when the suite is run. That also
-- means the fixture opens every day of the week rather than one specific weekday: whichever
-- date `now()` happens to land on has to be bookable for the base case to mean anything.
begin;
select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000f1', 'owner-search@test.local', '{"account_type":"BUSINESS","full_name":"Search Owner"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000f2', 'staff-search@test.local', '{"account_type":"BUSINESS","full_name":"Search Staff"}'::jsonb);

insert into categories (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000f3', 'Search Salons', 'search-salons');

insert into businesses (id, owner_profile_id, name, category_id, address, area, phone, timezone) values
  ('00000000-0000-0000-0000-0000000000f4', '00000000-0000-0000-0000-0000000000f1',
   'Always Open', '00000000-0000-0000-0000-0000000000f3', '1 Search St', 'Tel Aviv',
   '+972500000001', 'Asia/Jerusalem');

-- Open 09:00–17:00 every day, so the result never depends on which weekday now() falls on.
insert into business_hours (business_id, day_of_week, opens_at, closes_at)
  select '00000000-0000-0000-0000-0000000000f4', d, '09:00', '17:00' from generate_series(0, 6) as d;

insert into employees (id, business_id, profile_id, position_title) values
  ('00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000f4',
   '00000000-0000-0000-0000-0000000000f1', 'Stylist'),
  ('00000000-0000-0000-0000-0000000000f6', '00000000-0000-0000-0000-0000000000f4',
   '00000000-0000-0000-0000-0000000000f2', 'Junior Stylist');

-- The senior stylist works mornings only; the junior covers the full day. Two employees with
-- different windows is what makes "earliest across all pairs" a real assertion rather than a
-- restatement of get_available_slots().
insert into employee_availability_rules (employee_id, kind, day_of_week, starts_at, ends_at)
  select '00000000-0000-0000-0000-0000000000f5', 'WEEKLY_WINDOW', d, '09:00', '12:00' from generate_series(0, 6) as d;
insert into employee_availability_rules (employee_id, kind, day_of_week, starts_at, ends_at)
  select '00000000-0000-0000-0000-0000000000f6', 'WEEKLY_WINDOW', d, '09:00', '17:00' from generate_series(0, 6) as d;

insert into services (id, employee_id, name, price, duration_minutes, buffer_minutes) values
  ('00000000-0000-0000-0000-0000000000f7', '00000000-0000-0000-0000-0000000000f5', 'Haircut', 80.00, 30, 0),
  ('00000000-0000-0000-0000-0000000000f8', '00000000-0000-0000-0000-0000000000f6', 'Beard Trim', 40.00, 30, 0);

-- ---------------------------------------------------------------------------
-- Base behaviour
-- ---------------------------------------------------------------------------

select isnt(
  get_next_available('00000000-0000-0000-0000-0000000000f4', now(), now() + interval '14 days'),
  null,
  'a business open every day has a next available time'
);

select ok(
  get_next_available('00000000-0000-0000-0000-0000000000f4', now(), now() + interval '14 days') >= now(),
  'the returned slot is never in the past'
);

select ok(
  get_next_available('00000000-0000-0000-0000-0000000000f4', now(), now() + interval '14 days')
    < now() + interval '14 days',
  'the returned slot falls inside the requested window'
);

-- ---------------------------------------------------------------------------
-- Guards — the cases that must answer NULL rather than "no slots"
-- ---------------------------------------------------------------------------

select is(
  get_next_available('00000000-0000-0000-0000-00000000dead', now(), now() + interval '14 days'),
  null,
  'an unknown business id answers null rather than raising'
);

select is(
  get_next_available('00000000-0000-0000-0000-0000000000f4', now(), now() - interval '1 day'),
  null,
  'an inverted window answers null'
);

-- ---------------------------------------------------------------------------
-- §5.2's serviceQ filter
-- ---------------------------------------------------------------------------

select isnt(
  get_next_available('00000000-0000-0000-0000-0000000000f4', now(), now() + interval '14 days', 'haircut'),
  null,
  'serviceQ matches a service name case-insensitively'
);

select is(
  get_next_available('00000000-0000-0000-0000-0000000000f4', now(), now() + interval '14 days', 'colouring'),
  null,
  'serviceQ that matches no service answers null, not the business-wide next slot'
);

-- ---------------------------------------------------------------------------
-- §5.2's hourFrom/hourTo filter — wall-clock time in the *business's* zone
-- ---------------------------------------------------------------------------

select ok(
  (get_next_available('00000000-0000-0000-0000-0000000000f4', now(), now() + interval '14 days',
                      null, '15:00', '17:00')
    at time zone 'Asia/Jerusalem')::time >= '15:00',
  'hourFrom/hourTo narrow to the requested local hours'
);

-- Only the junior stylist works past 12:00, so an afternoon-only query can only be satisfied by
-- that employee — this is the assertion that the scan really spans every employee × service pair.
select is(
  (select count(*)::int from get_available_slots(
     '00000000-0000-0000-0000-0000000000f5', '00000000-0000-0000-0000-0000000000f7',
     now(), now() + interval '14 days')
   where (starts_at at time zone 'Asia/Jerusalem')::time >= '15:00'),
  0,
  'the senior stylist genuinely has no afternoon slots, so the previous result came from the junior'
);

select is(
  get_next_available('00000000-0000-0000-0000-0000000000f4', now(), now() + interval '14 days',
                     null, '22:00', '23:00'),
  null,
  'an hour range the business is never open for answers null'
);

-- ---------------------------------------------------------------------------
-- The 14-day horizon cap (§12.8) and the suspended-business rule (§6.9)
-- ---------------------------------------------------------------------------

-- A vacation covering the next 20 days leaves availability only beyond the cap. Without the cap
-- this call would happily scan out to 60 days and find a slot, so a non-null result here is
-- precisely the regression this test exists to catch.
insert into employee_availability_rules (employee_id, kind, effective_range) values
  ('00000000-0000-0000-0000-0000000000f5', 'VACATION', tstzrange(now(), now() + interval '20 days', '[)')),
  ('00000000-0000-0000-0000-0000000000f6', 'VACATION', tstzrange(now(), now() + interval '20 days', '[)'));

select is(
  get_next_available('00000000-0000-0000-0000-0000000000f4', now(), now() + interval '60 days'),
  null,
  'p_to beyond 14 days is clamped: availability on day 21 is not reported'
);

delete from employee_availability_rules where kind = 'VACATION';

update businesses set status = 'SUSPENDED' where id = '00000000-0000-0000-0000-0000000000f4';
select is(
  get_next_available('00000000-0000-0000-0000-0000000000f4', now(), now() + interval '14 days'),
  null,
  'a suspended business reports no availability (§6.9)'
);

select * from finish();
rollback;
