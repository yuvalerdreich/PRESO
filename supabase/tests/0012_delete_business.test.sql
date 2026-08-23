-- delete_business() (0034_fn_delete_business.sql) — requested change, superseding
-- 0010_rls.sql's businesses policy comment ("no DELETE policy — §4.1: 'not offered'"). Same
-- shape of coverage as 0010_roster.test.sql's other multi-row-invariant RPCs: what must be
-- impossible, what error each refusal raises, and — since this one is a genuine hard delete,
-- unlike remove_employee()'s soft-delete-on-conflict — that everything under the business is
-- actually gone afterward, not just the business row itself.
begin;
select plan(18);

set local role postgres;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000d1', 'founder-delbiz@test.local', '{"account_type":"BUSINESS","full_name":"Delbiz Founder"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000d2', 'active-delbiz@test.local',  '{"account_type":"BUSINESS","full_name":"Delbiz Active Staff"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000d3', 'inactive-delbiz@test.local','{"account_type":"BUSINESS","full_name":"Delbiz Inactive Staff"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000d4', 'client-delbiz@test.local',  '{"account_type":"CLIENT","full_name":"Delbiz Client"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000d5', 'joiner-delbiz@test.local',  '{"account_type":"BUSINESS","full_name":"Delbiz Joiner"}'::jsonb);

insert into categories (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000d6', 'Delbiz Cat', 'delbiz-cat');

-- The business and everything under it, all with fixed ids so the test can still name them after
-- delete_business() removes the rows — unlike 0010_roster.test.sql, which can afford to look
-- businesses up by name because it never deletes one.
insert into businesses (id, owner_profile_id, name, category_id, address, area, phone, timezone) values
  ('00000000-0000-0000-0000-0000000000d7', '00000000-0000-0000-0000-0000000000d1',
   'Delbiz Shop', '00000000-0000-0000-0000-0000000000d6', '1 Delbiz St', 'Tel Aviv', '+972500000031',
   'Asia/Jerusalem');

insert into employees (id, business_id, profile_id, position_title, status) values
  ('00000000-0000-0000-0000-0000000000d8', '00000000-0000-0000-0000-0000000000d7',
   '00000000-0000-0000-0000-0000000000d1', 'Owner', 'ACTIVE'),
  ('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000d7',
   '00000000-0000-0000-0000-0000000000d2', 'Stylist', 'ACTIVE'),
  ('00000000-0000-0000-0000-0000000000da', '00000000-0000-0000-0000-0000000000d7',
   '00000000-0000-0000-0000-0000000000d3', 'Retired Stylist', 'INACTIVE');

insert into services (id, employee_id, name, price, duration_minutes) values
  ('00000000-0000-0000-0000-0000000000db', '00000000-0000-0000-0000-0000000000d9', 'Cut', 60, 30);

insert into business_hours (business_id, day_of_week, opens_at, closes_at) values
  ('00000000-0000-0000-0000-0000000000d7', 1, '09:00', '18:00');

insert into employee_availability_rules (employee_id, kind, day_of_week, starts_at, ends_at) values
  ('00000000-0000-0000-0000-0000000000d9', 'WEEKLY_WINDOW', 1, '09:00', '17:00');

insert into join_requests (profile_id, business_id) values
  ('00000000-0000-0000-0000-0000000000d5', '00000000-0000-0000-0000-0000000000d7');

insert into waitlist_entries (id, client_profile_id, business_id, from_ts, to_ts) values
  ('00000000-0000-0000-0000-0000000000dc', '00000000-0000-0000-0000-0000000000d4',
   '00000000-0000-0000-0000-0000000000d7', now() + interval '1 day', now() + interval '2 days');
insert into waitlist_employee_targets (waitlist_entry_id, employee_id) values
  ('00000000-0000-0000-0000-0000000000dc', '00000000-0000-0000-0000-0000000000d9');

-- ---------------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d2","role":"authenticated"}';
select throws_ok(
  $$ select delete_business('00000000-0000-0000-0000-0000000000d7') $$,
  '42501', 'insufficient_privilege',
  'a non-owner cannot delete the business, even though it bypasses RLS'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select throws_ok(
  $$ select delete_business('00000000-0000-0000-0000-000000000fff') $$,
  '23503', 'not_found',
  'deleting a business that does not exist raises not_found'
);

-- ---------------------------------------------------------------------------
-- Refused while a future appointment exists (business-wide, not just the owner's own)
-- ---------------------------------------------------------------------------

set local role postgres;
reset request.jwt.claims;
insert into appointments (id, client_profile_id, employee_id, service_id, slot, status, created_by) values
  ('00000000-0000-0000-0000-0000000000dd', '00000000-0000-0000-0000-0000000000d4',
   '00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000db',
   tstzrange(now() + interval '3 days', now() + interval '3 days 30 minutes', '[)'), 'CONFIRMED',
   '00000000-0000-0000-0000-0000000000d4');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select throws_ok(
  $$ select delete_business('00000000-0000-0000-0000-0000000000d7') $$,
  'P0001', 'business_has_appointments',
  'the business cannot be deleted while any employee has a future, non-cancelled appointment'
);

select is(
  (select count(*)::int from businesses where id = '00000000-0000-0000-0000-0000000000d7'),
  1,
  'the business still exists after the refusal'
);

-- Cancelling clears the block, same as remove_employee()'s employee_has_appointments (§6.9). A
-- past appointment is added too, to prove history does not block deletion the way a future
-- booking does — it has no other home once the business is gone, so it must be deleted with it.
set local role postgres;
reset request.jwt.claims;
update appointments set status = 'CANCELLED', cancelled_at = now()
 where id = '00000000-0000-0000-0000-0000000000dd';
insert into appointments (id, client_profile_id, employee_id, service_id, slot, status, created_by) values
  ('00000000-0000-0000-0000-0000000000de', '00000000-0000-0000-0000-0000000000d4',
   '00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000db',
   tstzrange(now() - interval '10 days', now() - interval '10 days' + interval '30 minutes', '[)'),
   'CONFIRMED', '00000000-0000-0000-0000-0000000000d4');

-- ---------------------------------------------------------------------------
-- The real delete
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000d1","role":"authenticated"}';
select lives_ok(
  $$ select delete_business('00000000-0000-0000-0000-0000000000d7') $$,
  'the owner can delete the business once no future appointment remains'
);

set local role postgres;
reset request.jwt.claims;

select is(
  (select count(*)::int from businesses where id = '00000000-0000-0000-0000-0000000000d7'),
  0,
  'the business row itself is gone'
);

select is(
  (select count(*)::int from employees where business_id = '00000000-0000-0000-0000-0000000000d7'),
  0,
  'every employees row is gone (business_id on delete cascade)'
);

select is(
  (select count(*)::int from services where id = '00000000-0000-0000-0000-0000000000db'),
  0,
  'services are gone (cascaded via their employee)'
);

select is(
  (select count(*)::int from business_hours where business_id = '00000000-0000-0000-0000-0000000000d7'),
  0,
  'business_hours is gone'
);

select is(
  (select count(*)::int from employee_availability_rules where employee_id = '00000000-0000-0000-0000-0000000000d9'),
  0,
  'employee_availability_rules is gone (cascaded via its employee)'
);

select is(
  (select count(*)::int from appointments where id in
     ('00000000-0000-0000-0000-0000000000dd', '00000000-0000-0000-0000-0000000000de')),
  0,
  'both appointments are gone — the past one too, not only the cancelled future one'
);

select is(
  (select count(*)::int from join_requests where business_id = '00000000-0000-0000-0000-0000000000d7'),
  0,
  'join_requests is gone'
);

select is(
  (select count(*)::int from waitlist_entries where business_id = '00000000-0000-0000-0000-0000000000d7'),
  0,
  'waitlist_entries is gone'
);

select is(
  (select count(*)::int from waitlist_employee_targets where employee_id = '00000000-0000-0000-0000-0000000000d9'),
  0,
  'waitlist_employee_targets is gone (cascaded via both its waitlist entry and its employee)'
);

-- ---------------------------------------------------------------------------
-- Staff notification and the audit trail
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::int from notifications
    where profile_id = '00000000-0000-0000-0000-0000000000d2' and type = 'BUSINESS_DELETED'),
  1,
  'the ACTIVE staff member is notified that the business was deleted'
);

select is(
  (select count(*)::int from notifications
    where profile_id = '00000000-0000-0000-0000-0000000000d3' and type = 'BUSINESS_DELETED'),
  0,
  'a retired (INACTIVE) position is not notified'
);

select is(
  (select count(*)::int from notifications
    where profile_id = '00000000-0000-0000-0000-0000000000d1' and type = 'BUSINESS_DELETED'),
  0,
  'the owner, who performed the deletion themselves, is not notified of their own action'
);

select is(
  (select count(*)::int from audit_log
    where action = 'business.delete' and entity_id = '00000000-0000-0000-0000-0000000000d7'),
  1,
  'the deletion is recorded in audit_log'
);

select * from finish();
rollback;
