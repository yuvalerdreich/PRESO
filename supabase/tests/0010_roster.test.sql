-- The three roster RPCs (0017_fn_roster.sql) — TECHNICAL_DESIGN.md §4.1, §4.2, §6.8, §6.9.
--
-- Each exists because its invariant spans two rows and therefore cannot be enforced from two
-- sequential PostgREST calls. These assertions are about the invariants, not the happy path:
-- what must be impossible, and what error each refusal raises, since §8.2 maps them by name.
begin;
select plan(18);

set local role postgres;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'founder-roster@test.local', '{"account_type":"BUSINESS","full_name":"Roster Founder"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000c2', 'staff-roster@test.local',   '{"account_type":"BUSINESS","full_name":"Roster Staff"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000c3', 'joiner-roster@test.local',  '{"account_type":"BUSINESS","full_name":"Roster Joiner"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000c4', 'client-roster@test.local',  '{"account_type":"CLIENT","full_name":"Roster Client"}'::jsonb);

insert into categories (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000c5', 'Roster Cat', 'roster-cat');

-- ---------------------------------------------------------------------------
-- create_business_with_owner — §6.8 rule 3
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';

select lives_ok(
  $$ select create_business_with_owner('Roster Shop', '00000000-0000-0000-0000-0000000000c5',
       '1 Roster St', 'Tel Aviv', '+972500000021') $$,
  'a BUSINESS account can open a business'
);

select is(
  (select count(*)::int from employees e
     join businesses b on b.id = e.business_id
    where b.name = 'Roster Shop'),
  1,
  'the creator is inserted as employee #1 in the same call — never a business with zero employees'
);

select is(
  (select e.profile_id from employees e join businesses b on b.id = e.business_id where b.name = 'Roster Shop'),
  '00000000-0000-0000-0000-0000000000c1'::uuid,
  'and that employee is the creator, not someone else'
);

-- A CLIENT must upgrade via claim_business_account_type() first (§12.34); the RPC re-checks this
-- itself because `security definer` means the businesses_insert policy never runs.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c4","role":"authenticated"}';
select throws_ok(
  $$ select create_business_with_owner('Client Shop', '00000000-0000-0000-0000-0000000000c5',
       '2 Roster St', 'Tel Aviv', '+972500000022') $$,
  '42501', 'insufficient_privilege',
  'a CLIENT account cannot open a business, even though the RPC bypasses RLS'
);

-- ---------------------------------------------------------------------------
-- decide_join_request — §6.8 rules 5 and 6
-- ---------------------------------------------------------------------------

set local role postgres;
reset request.jwt.claims;
insert into join_requests (id, profile_id, business_id)
select '00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000c3', b.id
  from businesses b where b.name = 'Roster Shop';

-- Rule 6: the founder alone decides. A non-owner is refused even though staff may *read* requests.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c3","role":"authenticated"}';
select throws_ok(
  $$ select decide_join_request('00000000-0000-0000-0000-0000000000c6', 'APPROVED') $$,
  '42501', 'insufficient_privilege',
  'a non-owner cannot decide a join request (§6.8 rule 6)'
);

select is(
  (select count(*)::int from employees where profile_id = '00000000-0000-0000-0000-0000000000c3'),
  0,
  'rule 5: no employees row exists before approval — there is no pending employee to activate'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select lives_ok(
  $$ select decide_join_request('00000000-0000-0000-0000-0000000000c6', 'APPROVED', 'Stylist') $$,
  'the founder can approve'
);

select is(
  (select status::text from join_requests where id = '00000000-0000-0000-0000-0000000000c6'),
  'APPROVED',
  'the request is marked APPROVED'
);

select is(
  (select position_title from employees where profile_id = '00000000-0000-0000-0000-0000000000c3'),
  'Stylist',
  'and the employees row now exists, with the position the founder chose — one transaction'
);

-- Re-deciding a settled request is not a legal transition.
select throws_ok(
  $$ select decide_join_request('00000000-0000-0000-0000-0000000000c6', 'REJECTED') $$,
  'P0001', 'illegal_transition',
  'a request that has already been decided cannot be decided again'
);

select throws_ok(
  $$ select decide_join_request('00000000-0000-0000-0000-000000000fff', 'APPROVED') $$,
  '23503', 'not_found',
  'deciding a request that does not exist raises not_found'
);

-- ---------------------------------------------------------------------------
-- remove_employee — §6.8 rule 3's other half, and §6.9
-- ---------------------------------------------------------------------------

-- The joiner (employee #2) can be removed; the founder alone cannot, because that would empty
-- the roster. Removing #2 first proves the guard is about the *count*, not about who is asked.
select lives_ok(
  $$ select remove_employee((select id from employees where profile_id = '00000000-0000-0000-0000-0000000000c3')) $$,
  'the founder can remove a second employee'
);

select throws_ok(
  $$ select remove_employee((select id from employees where profile_id = '00000000-0000-0000-0000-0000000000c1')) $$,
  'P0001', 'last_employee',
  'the last employee cannot be removed — §8.2 maps last_employee to 422'
);

select is(
  (select count(*)::int from employees e join businesses b on b.id = e.business_id where b.name = 'Roster Shop'),
  1,
  'the business still has its one employee after the refusal'
);

-- §6.9 — an employee holding a future appointment cannot be removed; those bookings have to be
-- cancelled explicitly so each client is notified.
set local role postgres;
reset request.jwt.claims;
insert into employees (id, business_id, profile_id, position_title)
select '00000000-0000-0000-0000-0000000000c7', b.id, '00000000-0000-0000-0000-0000000000c2', 'Staff'
  from businesses b where b.name = 'Roster Shop';
insert into services (id, employee_id, name, price, duration_minutes) values
  ('00000000-0000-0000-0000-0000000000c8', '00000000-0000-0000-0000-0000000000c7', 'Cut', 50, 30);
insert into appointments (client_profile_id, employee_id, service_id, slot, status, created_by) values
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000c7',
   '00000000-0000-0000-0000-0000000000c8',
   tstzrange(now() + interval '3 days', now() + interval '3 days 30 minutes', '[)'), 'CONFIRMED',
   '00000000-0000-0000-0000-0000000000c4');

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';
select throws_ok(
  $$ select remove_employee('00000000-0000-0000-0000-0000000000c7') $$,
  'P0001', 'employee_has_appointments',
  'an employee with a future appointment cannot be removed (§6.9)'
);

-- Cancelling the appointment clears the block — the refusal is about live bookings, not history.
set local role postgres;
reset request.jwt.claims;
update appointments set status = 'CANCELLED', cancelled_at = now()
 where employee_id = '00000000-0000-0000-0000-0000000000c7';

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}';

-- The row cannot be deleted, because appointments.employee_id is `on delete restrict` and the
-- cancelled appointment still references it — so the position is retired instead, and the RPC
-- says which happened. History survives (§6.9); the roster no longer lists them.
select is(
  remove_employee('00000000-0000-0000-0000-0000000000c7'),
  true,
  'an employee with appointment history is retired rather than deleted, and reports it'
);

select is(
  (select status::text from employees where id = '00000000-0000-0000-0000-0000000000c7'),
  'INACTIVE',
  'the position row survives as INACTIVE so the past appointment keeps its foreign key'
);

select is(
  (select count(*)::int from appointments where employee_id = '00000000-0000-0000-0000-0000000000c7'),
  1,
  'and the appointment itself is untouched'
);

select * from finish();
rollback;
