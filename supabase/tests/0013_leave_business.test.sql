-- Self-service "leave a business" (§12.75; 0035_fn_remove_employee_self_leave.sql) — a staff
-- member who is not the owner can remove their own position from `/businesses` without asking the
-- owner. This is `remove_employee()` itself, broadened: same RPC, same §6.8-rule-3/§6.9 guards,
-- only the authorization check changed. 0010_roster.test.sql already covers the owner-removes-
-- someone-else path and now covers "the owner cannot remove themselves this way" too; this file is
-- about the new self-leave branch specifically.
begin;
select plan(9);

set local role postgres;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'founder-leave@test.local', '{"account_type":"BUSINESS","full_name":"Leave Founder"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000e2', 'staff-leave@test.local',   '{"account_type":"BUSINESS","full_name":"Leave Staff"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000e3', 'other-leave@test.local',   '{"account_type":"BUSINESS","full_name":"Leave Other Staff"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000e4', 'client-leave@test.local',  '{"account_type":"CLIENT","full_name":"Leave Client"}'::jsonb);

insert into categories (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000e5', 'Leave Cat', 'leave-cat');

insert into businesses (id, owner_profile_id, name, category_id, address, area, phone, timezone) values
  ('00000000-0000-0000-0000-0000000000e6', '00000000-0000-0000-0000-0000000000e1',
   'Leave Shop', '00000000-0000-0000-0000-0000000000e5', '1 Leave St', 'Tel Aviv', '+972500000041',
   'Asia/Jerusalem');

insert into employees (id, business_id, profile_id, position_title, status) values
  ('00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000e6',
   '00000000-0000-0000-0000-0000000000e1', 'Owner', 'ACTIVE'),
  ('00000000-0000-0000-0000-0000000000e8', '00000000-0000-0000-0000-0000000000e6',
   '00000000-0000-0000-0000-0000000000e2', 'Stylist', 'ACTIVE'),
  ('00000000-0000-0000-0000-0000000000e9', '00000000-0000-0000-0000-0000000000e6',
   '00000000-0000-0000-0000-0000000000e3', 'Assistant', 'ACTIVE');

insert into services (id, employee_id, name, price, duration_minutes) values
  ('00000000-0000-0000-0000-0000000000ea', '00000000-0000-0000-0000-0000000000e8', 'Cut', 60, 30);
insert into employee_availability_rules (employee_id, kind, day_of_week, starts_at, ends_at) values
  ('00000000-0000-0000-0000-0000000000e8', 'WEEKLY_WINDOW', 1, '09:00', '17:00');

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------

-- A non-owner staff member cannot remove a *different* colleague — only themselves.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';
select throws_ok(
  $$ select remove_employee('00000000-0000-0000-0000-0000000000e9') $$,
  '42501', 'insufficient_privilege',
  'a staff member cannot remove a colleague — only the owner, or the employee themselves'
);

-- A future appointment blocks leaving too, same as it blocks the owner removing someone (§6.9).
-- Deliberately on e9 (Assistant), not e8: e8 is kept appointment-free below, so its self-leave
-- proves the clean hard-delete path — an employee who has ever had *any* appointment (even a
-- cancelled one) is retired instead, per `appointments.employee_id`'s `on delete restrict`
-- (0010_roster.test.sql already covers that branch; this file's job is the auth check, not that
-- one again).
set local role postgres;
reset request.jwt.claims;
insert into services (id, employee_id, name, price, duration_minutes) values
  ('00000000-0000-0000-0000-0000000000ec', '00000000-0000-0000-0000-0000000000e9', 'Wash', 20, 15);
insert into appointments (id, client_profile_id, employee_id, service_id, slot, status, created_by) values
  ('00000000-0000-0000-0000-0000000000eb', '00000000-0000-0000-0000-0000000000e4',
   '00000000-0000-0000-0000-0000000000e9', '00000000-0000-0000-0000-0000000000ec',
   tstzrange(now() + interval '3 days', now() + interval '3 days 30 minutes', '[)'), 'CONFIRMED',
   '00000000-0000-0000-0000-0000000000e4');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}';
select throws_ok(
  $$ select remove_employee('00000000-0000-0000-0000-0000000000e9') $$,
  'P0001', 'employee_has_appointments',
  'a staff member cannot leave while they have a future, non-cancelled appointment'
);

-- Cancelling clears the block (the row itself stays — e9 is not touched again in this file).
set local role postgres;
reset request.jwt.claims;
update appointments set status = 'CANCELLED', cancelled_at = now()
 where id = '00000000-0000-0000-0000-0000000000eb';

-- ---------------------------------------------------------------------------
-- The real self-leave — e8 has never had an appointment, so this is a clean hard delete
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';
select lives_ok(
  $$ select remove_employee('00000000-0000-0000-0000-0000000000e8') $$,
  'a non-owner staff member can remove their own position'
);

set local role postgres;
reset request.jwt.claims;

select is(
  (select count(*)::int from employees where id = '00000000-0000-0000-0000-0000000000e8'),
  0,
  'the position with no appointment history is hard-deleted, not just deactivated'
);

select is(
  (select count(*)::int from services where id = '00000000-0000-0000-0000-0000000000ea'),
  0,
  'and their services go with it (cascaded via the employee)'
);

select is(
  (select count(*)::int from employee_availability_rules where employee_id = '00000000-0000-0000-0000-0000000000e8'),
  0,
  'and their working hours go with it too (cascaded via the employee)'
);

-- ---------------------------------------------------------------------------
-- The owner cannot use this path on themselves — delete_business() is their equivalent
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
select throws_ok(
  $$ select remove_employee('00000000-0000-0000-0000-0000000000e7') $$,
  '42501', 'insufficient_privilege',
  'the owner cannot remove their own position through self-leave, even with other staff remaining'
);

-- ---------------------------------------------------------------------------
-- last_employee still applies to a genuine self-leave, when it would empty the roster
-- ---------------------------------------------------------------------------

-- Contrived but real: the owner's own position is deactivated (something only the owner can do,
-- via setEmployeeStatus), leaving the one remaining staff member as the sole ACTIVE employee.
set local role postgres;
reset request.jwt.claims;
update employees set status = 'INACTIVE' where id = '00000000-0000-0000-0000-0000000000e7';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}';
select throws_ok(
  $$ select remove_employee('00000000-0000-0000-0000-0000000000e9') $$,
  'P0001', 'last_employee',
  'self-leave still refuses to empty the roster — §6.8 rule 3 does not bend for who is asking'
);

select is(
  (select count(*)::int from employees where id = '00000000-0000-0000-0000-0000000000e9'),
  1,
  'and that last position is still there after the refusal'
);

select * from finish();
rollback;
