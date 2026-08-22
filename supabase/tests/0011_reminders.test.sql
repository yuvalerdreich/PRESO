-- sweep_appointment_reminders() (TECHNICAL_DESIGN.md §12.x, 0031_appointment_reminders.sql) —
-- the daily cron sweep behind GET /api/cron/appointment-reminders. Business hours are opened
-- every day of the week, wide, specifically so a slot ~30h and ~10h from whenever this test
-- happens to run can always be found via get_available_slots() rather than pinning a fixed
-- calendar date and hoping "now" during a test run stays behind it (the fragility 0004's
-- fixed-Tuesday fixture accepts on purpose; a reminder sweep is inherently relative to "now",
-- so this file can't do the same).
begin;
select plan(5);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'owner-rem@test.local', '{"account_type":"BUSINESS","full_name":"Owner C"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000c2', 'client-rem@test.local', '{"account_type":"CLIENT","full_name":"Client C2"}'::jsonb);

insert into categories (id, name, slug) values ('00000000-0000-0000-0000-0000000000c3', 'Barbers', 'barbers-rem');
insert into businesses (id, owner_profile_id, name, category_id, address, area, phone, timezone, approval_policy) values
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000c1',
   'Reminder Test Shop', '00000000-0000-0000-0000-0000000000c3', '1 C St', 'Tel Aviv', '+972500000010', 'Asia/Jerusalem', 'AUTO');

-- wide open every day of the week, so a slot ~10h and ~30h from "now" is findable regardless
-- of which weekday the test happens to run on.
insert into business_hours (business_id, day_of_week, opens_at, closes_at)
  select '00000000-0000-0000-0000-0000000000c4', d, '00:00', '23:30' from generate_series(0, 6) as d;

insert into employees (id, business_id, profile_id, position_title) values
  ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000c1', 'Owner');
insert into employee_availability_rules (employee_id, kind, day_of_week, starts_at, ends_at)
  select '00000000-0000-0000-0000-0000000000c5', 'WEEKLY_WINDOW', d, '00:00', '23:30' from generate_series(0, 6) as d;
insert into services (id, employee_id, name, price, duration_minutes, buffer_minutes) values
  ('00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000c5', 'Cut', 50, 30, 0);

-- A: ~30h out, stays CONFIRMED -> should get reminded
select starts_at into temp t_slot_a from get_available_slots(
  '00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c6', now(), now() + interval '72 hours'
) where starts_at >= now() + interval '30 hours' order by starts_at limit 1;
select id into temp t_appt_a from book_appointment(
  '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c5',
  '00000000-0000-0000-0000-0000000000c6', (select starts_at from t_slot_a), '00000000-0000-0000-0000-0000000000c2'
);

-- B: ~10h out (before the [24h, 48h) window), stays CONFIRMED -> too soon, should NOT be reminded
select starts_at into temp t_slot_b from get_available_slots(
  '00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c6', now(), now() + interval '72 hours'
) where starts_at >= now() + interval '10 hours' and starts_at < now() + interval '20 hours' order by starts_at limit 1;
select id into temp t_appt_b from book_appointment(
  '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c5',
  '00000000-0000-0000-0000-0000000000c6', (select starts_at from t_slot_b), '00000000-0000-0000-0000-0000000000c2'
);

-- C: ~35h out but never confirmed (still PENDING) -> should NOT be reminded regardless of timing
select starts_at into temp t_slot_c from get_available_slots(
  '00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000c6', now(), now() + interval '72 hours'
) where starts_at >= now() + interval '35 hours' and starts_at not in (select starts_at from t_slot_a)
  order by starts_at limit 1;
select id into temp t_appt_c from book_appointment(
  '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c5',
  '00000000-0000-0000-0000-0000000000c6', (select starts_at from t_slot_c), '00000000-0000-0000-0000-0000000000c2'
);
update appointments set status = 'PENDING' where id = (select id from t_appt_c);

select results_eq(
  $$ select reminded from sweep_appointment_reminders() $$,
  $$ values (1) $$,
  'only the in-window CONFIRMED appointment (A) is reminded'
);

select ok(
  (select reminder_sent_at is not null from appointments where id = (select id from t_appt_a)),
  'A''s reminder_sent_at is stamped once reminded'
);

select is(
  (select payload->>'appointmentId' from notifications
    where type = 'APPOINTMENT_REMINDER' and profile_id = '00000000-0000-0000-0000-0000000000c2'),
  (select id::text from t_appt_a),
  'the APPOINTMENT_REMINDER notification names the right appointment'
);

select results_eq(
  $$ select reminded from sweep_appointment_reminders() $$,
  $$ values (0) $$,
  'a second sweep reminds nobody again — reminder_sent_at makes it idempotent'
);

select is(
  (select count(*)::int from notifications where type = 'APPOINTMENT_REMINDER'),
  1,
  'B (too soon) and C (still PENDING) were never reminded — exactly one notification total'
);

select * from finish();
rollback;
