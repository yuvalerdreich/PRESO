-- Notifications, the waitlist-matcher wiring, and audit_log (TECHNICAL_DESIGN.md §1's
-- file-plan for 0009_triggers.sql) — the same scenarios verified by hand while building it.
begin;
select plan(19);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'owner-trg@test.local', '{"account_type":"BUSINESS","full_name":"Owner C"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000c8', 'staff-trg@test.local', '{"account_type":"BUSINESS","full_name":"Staff C8"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000c2', 'client-trg2@test.local', '{"account_type":"CLIENT","full_name":"Client C2"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000c3', 'client-trg3@test.local', '{"account_type":"CLIENT","full_name":"Client C3"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000c4', 'wannabe-admin@test.local', '{"account_type":"ADMIN","full_name":"Wannabe Admin"}'::jsonb);

-- 1-2. handle_new_user
select is((select account_type::text from profiles where id = '00000000-0000-0000-0000-0000000000c1'), 'BUSINESS', 'a BUSINESS signup claim is honoured');
select is((select account_type::text from profiles where id = '00000000-0000-0000-0000-0000000000c4'), 'CLIENT', 'an ADMIN signup claim is silently refused, defaulting to CLIENT');

-- 3. business timezone validation
select throws_ok(
  $$ insert into businesses (owner_profile_id, name, category_id, address, area, phone, timezone)
     values ('00000000-0000-0000-0000-0000000000c1','Bad TZ','00000000-0000-0000-0000-000000000000','1 St','TA','+972500000000','Not/AZone') $$,
  null, null,
  'an invalid IANA timezone is rejected'
);

insert into categories (id, name, slug) values ('00000000-0000-0000-0000-0000000000c5', 'Barbers', 'barbers-trg');
insert into businesses (id, owner_profile_id, name, category_id, address, area, phone, timezone, approval_policy) values
  ('00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000c1', 'Trigger Test Shop', '00000000-0000-0000-0000-0000000000c5',
   '1 C St', 'Tel Aviv', '+972500000010', 'Asia/Jerusalem', 'MANUAL');
insert into business_hours (business_id, day_of_week, opens_at, closes_at) values ('00000000-0000-0000-0000-0000000000c6', 2, '09:00', '17:00');
insert into employees (id, business_id, profile_id, position_title) values ('00000000-0000-0000-0000-0000000000c7', '00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000c1', 'Owner');
insert into employee_availability_rules (employee_id, kind, day_of_week, starts_at, ends_at) values ('00000000-0000-0000-0000-0000000000c7', 'WEEKLY_WINDOW', 2, '09:00', '17:00');
insert into services (id, employee_id, name, price, duration_minutes, buffer_minutes) values ('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000c7', 'Cut', 50, 30, 0);

-- 4-6. join_requests
insert into join_requests (id, profile_id, business_id) values ('00000000-0000-0000-0000-000000000c0a', '00000000-0000-0000-0000-0000000000c8', '00000000-0000-0000-0000-0000000000c6');
select is(
  (select profile_id from notifications where type = 'JOIN_REQUEST_RECEIVED' and payload->>'requestId' = '00000000-0000-0000-0000-000000000c0a'),
  '00000000-0000-0000-0000-0000000000c1'::uuid, 'a new join request notifies the owner'
);
update join_requests set status = 'APPROVED', decided_by = '00000000-0000-0000-0000-0000000000c1', decided_at = now() where id = '00000000-0000-0000-0000-000000000c0a';
select is(
  (select payload->>'decision' from notifications where type = 'JOIN_REQUEST_DECIDED' and profile_id = '00000000-0000-0000-0000-0000000000c8'),
  'APPROVED', 'deciding a join request notifies the applicant'
);
select is(
  (select count(*)::int from audit_log where entity = 'join_requests' and action = 'join_request.approve'),
  1, 'approving a join request writes one audit_log row'
);

-- 7-8. appointment lifecycle: CREATED (on insert), CONFIRMED (PENDING->CONFIRMED)
select id into temp t_appt1 from book_appointment(
  '00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c7',
  '00000000-0000-0000-0000-0000000000c9', '2026-09-01T09:00:00+03', '00000000-0000-0000-0000-0000000000c2'
);
select is(
  (select array_agg(type::text order by created_at) from notifications where payload->>'appointmentId' = (select id::text from t_appt1)),
  array['APPOINTMENT_CREATED'], 'booking under MANUAL policy fires exactly one APPOINTMENT_CREATED notice'
);
select approve_appointment((select id from t_appt1), '00000000-0000-0000-0000-0000000000c1');
select is(
  (select array_agg(type::text order by created_at) from notifications where payload->>'appointmentId' = (select id::text from t_appt1)),
  array['APPOINTMENT_CREATED', 'APPOINTMENT_CONFIRMED'], 'approving adds an APPOINTMENT_CONFIRMED notice, addressed to the client'
);

-- 9-10. cancel by the client -> notifies the assigned employee, and fires the waitlist matcher
insert into waitlist_entries (id, client_profile_id, business_id, service_id, from_ts, to_ts) values
  ('00000000-0000-0000-0000-000000000c0b', '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c6', null, '2026-09-01T00:00:00+03', '2026-09-01T23:59:59+03');
select cancel_appointment((select id from t_appt1), '00000000-0000-0000-0000-0000000000c2');
select is(
  (select profile_id from notifications where type = 'APPOINTMENT_CANCELLED' and payload->>'appointmentId' = (select id::text from t_appt1)),
  '00000000-0000-0000-0000-0000000000c1'::uuid, 'a client self-cancel notifies the assigned employee, not the client'
);
select is(
  (select status::text from waitlist_entries where id = '00000000-0000-0000-0000-000000000c0b'),
  'MATCHED', 'cancelling automatically fires the waitlist matcher — no manual call needed'
);

-- 11-12. reject_appointment: exactly one notification, reason carried in the payload,
-- suppressing the generic trigger
select id into temp t_appt2 from book_appointment(
  '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c7',
  '00000000-0000-0000-0000-0000000000c9', '2026-09-01T10:00:00+03', '00000000-0000-0000-0000-0000000000c3'
);
select reject_appointment((select id from t_appt2), '00000000-0000-0000-0000-0000000000c1', 'fully booked that day');
select is(
  (select count(*)::int from notifications where payload->>'appointmentId' = (select id::text from t_appt2) and type = 'APPOINTMENT_REJECTED'),
  1, 'reject fires exactly one APPOINTMENT_REJECTED notice (the generic trigger is suppressed)'
);
select is(
  (select payload->>'reason' from notifications where payload->>'appointmentId' = (select id::text from t_appt2) and type = 'APPOINTMENT_REJECTED'),
  'fully booked that day', 'the rejection reason rides on the notification payload'
);

-- 13-15. reschedule: exactly one RESCHEDULED notice, no stray CREATED/CANCELLED for either row
select id into temp t_appt3 from book_appointment(
  '00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c7',
  '00000000-0000-0000-0000-0000000000c9', '2026-09-01T11:00:00+03', '00000000-0000-0000-0000-0000000000c1'
);
select id into temp t_appt3_new from reschedule_appointment((select id from t_appt3), '2026-09-01T13:00:00+03', '00000000-0000-0000-0000-0000000000c3');
select is(
  (select array_agg(type::text order by created_at) from notifications where payload->>'appointmentId' = (select id::text from t_appt3)),
  array['APPOINTMENT_CREATED'], 'the OLD row keeps only its original CREATED notice — no stray CANCELLED'
);
select is(
  (select count(*)::int from notifications where payload->>'appointmentId' = (select id::text from t_appt3_new) and type = 'APPOINTMENT_CREATED'),
  0, 'the NEW row gets no generic CREATED notice — reschedule sends its own RESCHEDULED notice instead'
);
select is(
  (select count(*)::int from notifications where type = 'APPOINTMENT_RESCHEDULED' and payload->>'previousStartsAt' is not null),
  1, 'exactly one APPOINTMENT_RESCHEDULED notice exists, carrying the previous start time'
);

-- 16-19. audit_log: suspend business/profile, remove employee, resolve report
update businesses set status = 'SUSPENDED' where id = '00000000-0000-0000-0000-0000000000c6';
select is((select count(*)::int from audit_log where entity = 'businesses' and action = 'business.suspend'), 1, 'suspending a business writes an audit_log row');
update profiles set status = 'SUSPENDED' where id = '00000000-0000-0000-0000-0000000000c3';
select is((select count(*)::int from audit_log where entity = 'profiles' and action = 'user.suspend'), 1, 'suspending a profile writes an audit_log row');

insert into employees (id, business_id, profile_id, position_title) values ('00000000-0000-0000-0000-000000000c0c', '00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000c8', 'Temp Staff');
delete from employees where id = '00000000-0000-0000-0000-000000000c0c';
select is((select count(*)::int from audit_log where entity = 'employees' and action = 'employee.remove'), 1, 'removing an employee writes an audit_log row');

insert into reports (id, reporter_profile_id, target_type, target_id, description) values
  ('00000000-0000-0000-0000-000000000c0d', '00000000-0000-0000-0000-0000000000c2', 'BUSINESS', '00000000-0000-0000-0000-0000000000c6', 'unprofessional behaviour reported');
update reports set status = 'RESOLVED', resolution_note = 'warned the business' where id = '00000000-0000-0000-0000-000000000c0d';
select is((select count(*)::int from audit_log where entity = 'reports' and action = 'report.resolve'), 1, 'resolving a report writes an audit_log row');

select * from finish();
rollback;
