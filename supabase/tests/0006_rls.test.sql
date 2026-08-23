-- RLS (TECHNICAL_DESIGN.md §3.14, 0010_rls.sql) — simulates PostgREST-mediated requests by
-- setting `role` + `request.jwt.claims` the way auth.uid()/auth.role() read them. The same
-- scenarios verified by hand while building the migration.
begin;
select plan(19);

set local role postgres;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'owner-rls@test.local', '{"account_type":"BUSINESS","full_name":"Owner D"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000d2', 'staff-rls@test.local', '{"account_type":"BUSINESS","full_name":"Staff D2"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000d3', 'client-rls3@test.local', '{"account_type":"CLIENT","full_name":"Client D3"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000d4', 'client-rls4@test.local', '{"account_type":"CLIENT","full_name":"Client D4"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000d5', 'admin-rls@test.local', '{"full_name":"Admin D5"}'::jsonb);
update profiles set account_type = 'ADMIN' where id = '00000000-0000-0000-0000-0000000000d5';

insert into categories (id, name, slug) values ('00000000-0000-0000-0000-0000000000d6', 'Barbers', 'barbers-rls');
insert into businesses (id, owner_profile_id, name, category_id, address, area, phone, timezone, approval_policy) values
  ('00000000-0000-0000-0000-0000000000d7', '00000000-0000-0000-0000-0000000000d1', 'RLS Test Shop', '00000000-0000-0000-0000-0000000000d6',
   '1 D St', 'Tel Aviv', '+972500000011', 'Asia/Jerusalem', 'AUTO');
insert into business_hours (business_id, day_of_week, opens_at, closes_at) values ('00000000-0000-0000-0000-0000000000d7', 2, '09:00', '17:00');
insert into employees (id, business_id, profile_id, position_title) values
  ('00000000-0000-0000-0000-0000000000d8', '00000000-0000-0000-0000-0000000000d7', '00000000-0000-0000-0000-0000000000d1', 'Owner'),
  ('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000d7', '00000000-0000-0000-0000-0000000000d2', 'Staff');
insert into employee_availability_rules (employee_id, kind, day_of_week, starts_at, ends_at) values ('00000000-0000-0000-0000-0000000000d8', 'WEEKLY_WINDOW', 2, '09:00', '17:00');
insert into services (id, employee_id, name, price, duration_minutes, buffer_minutes) values ('00000000-0000-0000-0000-0000000000da', '00000000-0000-0000-0000-0000000000d8', 'Cut', 50, 30, 0);

-- 1-2. anon: can read an ACTIVE business, cannot write it
set local role anon;
reset request.jwt.claims;
select is((select count(*)::int from businesses where id = '00000000-0000-0000-0000-0000000000d7'), 1, 'anon can read an ACTIVE business');
select throws_ok(
  $$ update businesses set name = 'Hacked' where id = '00000000-0000-0000-0000-0000000000d7' $$,
  null, null, 'anon has no write grant on businesses at all'
);

-- 3. staff (employee, not owner) CAN edit business details — decided §12.1
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
update businesses set description = 'edited by staff' where id = '00000000-0000-0000-0000-0000000000d7';
select is((select description from businesses where id = '00000000-0000-0000-0000-0000000000d7'), 'edited by staff', 'any ACTIVE employee can edit business details (§12.1)');

-- 4. staff CANNOT manage the roster — RLS filters the row, so the DELETE silently affects 0 rows
delete from employees where id = '00000000-0000-0000-0000-0000000000d9';
select is((select count(*)::int from employees where id = '00000000-0000-0000-0000-0000000000d9'), 1, 'staff cannot remove employees — roster management stays owner-only');

-- 5. an unrelated client: public read still works, writes are silently filtered
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}';
select is((select count(*)::int from businesses where id = '00000000-0000-0000-0000-0000000000d7'), 1, 'an unrelated authenticated user still gets public read');
update businesses set name = 'still hacked' where id = '00000000-0000-0000-0000-0000000000d7';
select is((select name from businesses where id = '00000000-0000-0000-0000-0000000000d7'), 'RLS Test Shop', 'an unrelated user''s write is silently filtered by RLS');

-- 6-7. profiles: self can update full_name, cannot self-elevate account_type
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}';
update profiles set full_name = 'Client D3 Renamed' where id = '00000000-0000-0000-0000-0000000000d3';
select is((select full_name from profiles where id = '00000000-0000-0000-0000-0000000000d3'), 'Client D3 Renamed', 'a user can rename themselves');
select throws_ok(
  $$ update profiles set account_type = 'ADMIN' where id = '00000000-0000-0000-0000-0000000000d3' $$,
  '42501', null, 'self account_type escalation is blocked by the protective trigger'
);

-- 8. admin CAN change another profile's status
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d5","role":"authenticated"}';
update profiles set status = 'SUSPENDED' where id = '00000000-0000-0000-0000-0000000000d3';
select is((select status::text from profiles where id = '00000000-0000-0000-0000-0000000000d3'), 'SUSPENDED', 'admin can change another profile''s status');
update profiles set status = 'ACTIVE' where id = '00000000-0000-0000-0000-0000000000d3';

-- 9-11. appointments: no direct write even for the client themselves; the RPC still works
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d3","role":"authenticated"}';
select throws_ok(
  $$ insert into appointments (client_profile_id, employee_id, service_id, slot, status, created_by)
     values ('00000000-0000-0000-0000-0000000000d3','00000000-0000-0000-0000-0000000000d8','00000000-0000-0000-0000-0000000000da',
             tstzrange('2026-09-01T09:00:00+03','2026-09-01T09:30:00+03','[)'),'CONFIRMED','00000000-0000-0000-0000-0000000000d3') $$,
  null, null, 'a client cannot insert into appointments directly, even their own'
);
select id into temp t_rls_appt from book_appointment(
  '00000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-0000000000d8',
  '00000000-0000-0000-0000-0000000000da', '2026-09-01T09:00:00+03', '00000000-0000-0000-0000-0000000000d3'
);
select is((select count(*)::int from appointments where id = (select id from t_rls_appt)), 1, 'the security-definer RPC succeeds despite no direct grant');
select is((select count(*)::int from appointments where id = (select id from t_rls_appt)), 1, 'the client can SELECT their own appointment');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}';
select is((select count(*)::int from appointments where id = (select id from t_rls_appt)), 0, 'an unrelated client sees none of it');

-- 12-13. notifications: own row only, cannot tamper with protected columns, can flip read_at.
-- d1 (the assigned employee) was notified when d3 booked the appointment above (test 9-11) —
-- looked up and used entirely within d1's own role context, since a temp table created as
-- postgres isn't visible after switching to authenticated (RLS aside, it's a plain GRANT gap).
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select id into temp t_notif from notifications where profile_id = '00000000-0000-0000-0000-0000000000d1' limit 1;
update notifications set read_at = now() where id = (select id from t_notif);
select ok((select read_at is not null from notifications where id = (select id from t_notif)), 'a user can mark their own notification read');
select throws_ok(
  format($f$ update notifications set type = 'WAITLIST_MATCHED' where id = '%s' $f$, (select id from t_notif)),
  '42501', null, 'tampering with a notification''s type is blocked by the protective trigger'
);

-- notifications_delete (0032): own row only, admin all — same shape as notifications_update.
-- The existence checks below run as `postgres` (RLS bypassed) rather than as either
-- authenticated party, because notifications_select is itself own-row-only: checking "does the
-- row still exist" as d4 or d1 would just re-hit the SELECT policy and read 0 regardless of
-- whether the DELETE actually happened, which isn't what either assertion is about.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d4","role":"authenticated"}';
delete from notifications where id = (select id from t_notif);

set local role postgres;
reset request.jwt.claims;
select is(
  (select count(*)::int from notifications where id = (select id from t_notif)), 1,
  'an unrelated user''s delete on someone else''s notification is silently filtered'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
delete from notifications where id = (select id from t_notif);

set local role postgres;
reset request.jwt.claims;
select is(
  (select count(*)::int from notifications where id = (select id from t_notif)), 0,
  'a user can delete their own notification'
);
set local role authenticated;

-- 14-15. audit_log: admin-only read
set local role postgres;
reset request.jwt.claims;
update businesses set status = 'SUSPENDED' where id = '00000000-0000-0000-0000-0000000000d7';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select is((select count(*)::int from audit_log), 0, 'a non-admin sees zero audit_log rows');
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d5","role":"authenticated"}';
select ok((select count(*) > 0 from audit_log), 'an admin sees audit_log rows');

select * from finish();
rollback;
