-- book_appointment / cancel_appointment / reschedule_appointment / approve_appointment /
-- reject_appointment (TECHNICAL_DESIGN.md §6.2–§6.4, §12.30) plus the exclusion constraint
-- itself — the same scenarios verified by hand while building 0007_fn_booking.sql.
begin;
select plan(19);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'owner1-book@test.local', '{"account_type":"BUSINESS","full_name":"Owner One"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000b7', 'staff2-book@test.local', '{"account_type":"BUSINESS","full_name":"Staff Two"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000b6', 'client1-book@test.local', '{"account_type":"CLIENT","full_name":"Client One"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000b9', 'client9-book@test.local', '{"account_type":"CLIENT","full_name":"Client Nine"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000ba', 'owner2-book@test.local', '{"account_type":"BUSINESS","full_name":"Owner Two"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000bb', 'client5-book@test.local', '{"account_type":"CLIENT","full_name":"Client Five"}'::jsonb);

insert into categories (id, name, slug) values ('00000000-0000-0000-0000-0000000000b2', 'Barbers', 'barbers-book');

-- business1: AUTO approval
insert into businesses (id, owner_profile_id, name, category_id, address, area, phone, timezone, approval_policy) values
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b1',
   'Auto Barbershop', '00000000-0000-0000-0000-0000000000b2', '1 Test St', 'Tel Aviv',
   '+972500000001', 'Asia/Jerusalem', 'AUTO');
insert into business_hours (business_id, day_of_week, opens_at, closes_at) values ('00000000-0000-0000-0000-0000000000b3', 2, '09:00', '17:00');
insert into employees (id, business_id, profile_id, position_title) values
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b1', 'Owner'),
  ('00000000-0000-0000-0000-0000000000b8', '00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b7', 'Barber');
insert into employee_availability_rules (employee_id, kind, day_of_week, starts_at, ends_at) values ('00000000-0000-0000-0000-0000000000b4', 'WEEKLY_WINDOW', 2, '09:00', '17:00');
insert into services (id, employee_id, name, price, duration_minutes, buffer_minutes) values ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-0000000000b4', 'Haircut', 50, 30, 0);

-- business2: MANUAL approval
insert into businesses (id, owner_profile_id, name, category_id, address, area, phone, timezone, approval_policy) values
  ('00000000-0000-0000-0000-0000000000bc', '00000000-0000-0000-0000-0000000000ba',
   'Manual Clinic', '00000000-0000-0000-0000-0000000000b2', '2 Test St', 'Haifa', '+972500000002', 'Asia/Jerusalem', 'MANUAL');
insert into business_hours (business_id, day_of_week, opens_at, closes_at) values ('00000000-0000-0000-0000-0000000000bc', 2, '09:00', '17:00');
insert into employees (id, business_id, profile_id, position_title) values ('00000000-0000-0000-0000-0000000000bd', '00000000-0000-0000-0000-0000000000bc', '00000000-0000-0000-0000-0000000000ba', 'Owner');
insert into employee_availability_rules (employee_id, kind, day_of_week, starts_at, ends_at) values ('00000000-0000-0000-0000-0000000000bd', 'WEEKLY_WINDOW', 2, '09:00', '17:00');
insert into services (id, employee_id, name, price, duration_minutes, buffer_minutes) values ('00000000-0000-0000-0000-0000000000be', '00000000-0000-0000-0000-0000000000bd', 'Consult', 100, 30, 0);

-- 1. self-book, AUTO -> CONFIRMED
select is(
  (select status::text from book_appointment(
    '00000000-0000-0000-0000-0000000000b6', '00000000-0000-0000-0000-0000000000b4',
    '00000000-0000-0000-0000-0000000000b5', '2026-09-01T09:00:00+03', '00000000-0000-0000-0000-0000000000b6'
  )),
  'CONFIRMED', 'self-book under AUTO policy is immediately CONFIRMED'
);

-- 2. staff manual booking on behalf of a client, different slot -> CONFIRMED, staff-created is pre-approved
select is(
  (select created_by from book_appointment(
    '00000000-0000-0000-0000-0000000000b6', '00000000-0000-0000-0000-0000000000b4',
    '00000000-0000-0000-0000-0000000000b5', '2026-09-01T14:00:00+03', '00000000-0000-0000-0000-0000000000b7'
  )),
  '00000000-0000-0000-0000-0000000000b7'::uuid, 'manual booking records the staff member as created_by'
);

-- 3. an unrelated client cannot book on behalf of someone else
select throws_like(
  $$ select book_appointment('00000000-0000-0000-0000-0000000000b6','00000000-0000-0000-0000-0000000000b4','00000000-0000-0000-0000-0000000000b5','2026-09-01T11:00:00+03','00000000-0000-0000-0000-0000000000b9') $$,
  '%insufficient_privilege%',
  'a non-staff, non-self actor cannot book for another client'
);

-- 4. self-book under MANUAL policy -> PENDING
select is(
  (select status::text from book_appointment(
    '00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000bd',
    '00000000-0000-0000-0000-0000000000be', '2026-09-01T09:00:00+03', '00000000-0000-0000-0000-0000000000bb'
  )),
  'PENDING', 'self-book under MANUAL policy lands PENDING'
);

-- 5. the RPC's own re-check catches an already-taken slot before ever reaching the constraint
select throws_like(
  $$ select book_appointment('00000000-0000-0000-0000-0000000000b9','00000000-0000-0000-0000-0000000000b4','00000000-0000-0000-0000-0000000000b5','2026-09-01T09:00:00+03','00000000-0000-0000-0000-0000000000b9') $$,
  '%slot_unavailable%',
  'booking an already-taken slot is rejected by the availability re-check'
);

-- 6. a raw INSERT bypassing the RPC still hits the exclusion constraint (23P01) — the real backstop
select throws_ok(
  $$ insert into appointments (client_profile_id, employee_id, service_id, slot, status, created_by)
     values ('00000000-0000-0000-0000-0000000000b9','00000000-0000-0000-0000-0000000000b4','00000000-0000-0000-0000-0000000000b5',
             tstzrange('2026-09-01T09:15:00+03','2026-09-01T09:45:00+03','[)'),'CONFIRMED','00000000-0000-0000-0000-0000000000b9') $$,
  '23P01', null,
  'a raw insert into an overlapping slot hits appointments_no_overlap directly'
);

-- 7. client cancels their own CONFIRMED appointment with plenty of notice
select is(
  (select status::text from cancel_appointment(
    (select id from appointments where client_profile_id = '00000000-0000-0000-0000-0000000000b6' and lower(slot) = '2026-09-01T09:00:00+03'::timestamptz),
    '00000000-0000-0000-0000-0000000000b6'
  )),
  'CANCELLED', 'client self-cancel succeeds with notice'
);

-- 8. staff2 is not the assigned employee on the manual booking (assigned = owner''s position b4)
--    nor the owner, so cancel must reject them even though staff2 created it
select throws_like(
  format($f$ select cancel_appointment('%s','00000000-0000-0000-0000-0000000000b7') $f$,
    (select id from appointments where employee_id = '00000000-0000-0000-0000-0000000000b4' and lower(slot) = '2026-09-01T14:00:00+03'::timestamptz)),
  '%insufficient_privilege%',
  'staff who created an appointment but is not its assigned employee cannot cancel it'
);

-- 9. the owner CAN cancel that same appointment
select is(
  (select status::text from cancel_appointment(
    (select id from appointments where employee_id = '00000000-0000-0000-0000-0000000000b4' and lower(slot) = '2026-09-01T14:00:00+03'::timestamptz),
    '00000000-0000-0000-0000-0000000000b1'
  )),
  'CANCELLED', 'the owner can cancel any appointment on their business'
);

-- 10. approve_appointment: owner approves a PENDING row -> CONFIRMED
select is(
  (select status::text from approve_appointment(
    (select id from appointments where client_profile_id = '00000000-0000-0000-0000-0000000000bb' and status = 'PENDING'),
    '00000000-0000-0000-0000-0000000000ba'
  )),
  'CONFIRMED', 'owner approve flips PENDING to CONFIRMED'
);

-- 11. approve_appointment: the client cannot approve their own PENDING request (would bypass MANUAL policy)
insert into services (id, employee_id, name, price, duration_minutes, buffer_minutes) values ('00000000-0000-0000-0000-0000000000bf', '00000000-0000-0000-0000-0000000000bd', 'Consult 2', 100, 30, 0);
select id into temp t_pending_appt from book_appointment(
  '00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000bd',
  '00000000-0000-0000-0000-0000000000bf', '2026-09-01T10:00:00+03', '00000000-0000-0000-0000-0000000000bb'
);
select throws_like(
  format($f$ select approve_appointment('%s','00000000-0000-0000-0000-0000000000bb') $f$, (select id from t_pending_appt)),
  '%insufficient_privilege%',
  'a client cannot approve their own PENDING appointment'
);

-- 12. reject_appointment: owner rejects a PENDING row -> CANCELLED, with a reason
select is(
  (select status::text from reject_appointment((select id from t_pending_appt), '00000000-0000-0000-0000-0000000000ba', 'fully booked')),
  'CANCELLED', 'owner reject flips PENDING to CANCELLED'
);

-- 13. reject only makes sense from PENDING — rejecting an already-CANCELLED row is illegal
select throws_like(
  format($f$ select reject_appointment('%s','00000000-0000-0000-0000-0000000000ba') $f$, (select id from t_pending_appt)),
  '%illegal_transition%',
  'rejecting an already-terminal appointment is refused'
);

-- 14. reschedule_appointment: owner reschedules a fresh booking to a new time -> CONFIRMED
--     (owner is staff, so the new row is pre-approved regardless of approval_policy)
select id into temp t_appt_c from book_appointment(
  '00000000-0000-0000-0000-0000000000b9', '00000000-0000-0000-0000-0000000000b4',
  '00000000-0000-0000-0000-0000000000b5', '2026-09-01T11:00:00+03', '00000000-0000-0000-0000-0000000000b9'
);
select id into temp t_appt_c_new from reschedule_appointment(
  (select id from t_appt_c), '2026-09-01T15:00:00+03', '00000000-0000-0000-0000-0000000000b1'
);
select is(
  (select status::text from appointments where id = (select id from t_appt_c_new)),
  'CONFIRMED', 'owner reschedule succeeds and the new row is CONFIRMED'
);
select is(
  (select status::text from appointments where id = (select id from t_appt_c)),
  'CANCELLED', 'the old row is cancelled by a successful reschedule'
);

-- 15. reschedule rollback: target slot already taken -> raises, and the row being rescheduled
--     must remain completely untouched (still CONFIRMED at its ORIGINAL time)
select id into temp t_appt_d from book_appointment(
  '00000000-0000-0000-0000-0000000000bb', '00000000-0000-0000-0000-0000000000b4',
  '00000000-0000-0000-0000-0000000000b5', '2026-09-01T10:00:00+03', '00000000-0000-0000-0000-0000000000b1'
);
select throws_like(
  format($f$ select reschedule_appointment('%s','2026-09-01T15:00:00+03','00000000-0000-0000-0000-0000000000b1') $f$, (select id from t_appt_d)),
  '%slot_unavailable%',
  'rescheduling onto an occupied slot is refused'
);
select ok(
  (select status = 'CONFIRMED' and lower(slot) = '2026-09-01T10:00:00+03'::timestamptz
     from appointments where id = (select id from t_appt_d)),
  'the failed reschedule left the original appointment completely untouched'
);

-- 16. cancellation window: a raw-inserted appointment 2h from now (default 24h window) —
--     the client cannot cancel it online, but the owner can, regardless
insert into appointments (id, client_profile_id, employee_id, service_id, slot, status, created_by) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000bb',
   '00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000b5',
   tstzrange(now() + interval '2 hours', now() + interval '2 hours 30 minutes', '[)'),
   'CONFIRMED', '00000000-0000-0000-0000-0000000000bb');
select throws_like(
  $$ select cancel_appointment('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000bb') $$,
  '%cancellation_window_closed%',
  'the client cannot cancel with only 2h notice against a 24h window'
);

-- 17. the owner can cancel that same appointment despite the window
select is(
  (select status::text from cancel_appointment('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000b1')),
  'CANCELLED', 'staff/owner always bypass the cancellation window'
);

select * from finish();
rollback;
