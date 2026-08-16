-- The two public-projection views (0015_display_fields.sql, 0016_client_contacts.sql).
--
-- Both run with `security_invoker = false`, i.e. as their owner, which means they bypass RLS on
-- `profiles` entirely. That is deliberate and it is also the whole risk: a mistake in either
-- definition leaks personal data to anyone who can reach the view. These assertions pin what each
-- one is allowed to expose, and to whom.
begin;
select plan(11);

set local role postgres;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000b1', 'owner-view@test.local',  '{"account_type":"BUSINESS","full_name":"View Owner"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000b2', 'client-view@test.local', '{"account_type":"CLIENT","full_name":"View Client"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000b3', 'other-view@test.local',  '{"account_type":"BUSINESS","full_name":"Unrelated Owner"}'::jsonb);

update profiles set phone = '+972500000099', date_of_birth = '1990-01-01', location = 'Tel Aviv'
 where id = '00000000-0000-0000-0000-0000000000b2';
update profiles set avatar_url = 'https://example.test/avatar.png'
 where id = '00000000-0000-0000-0000-0000000000b1';

insert into categories (id, name, slug) values ('00000000-0000-0000-0000-0000000000b4', 'View Cat', 'view-cat');
insert into businesses (id, owner_profile_id, name, category_id, address, area, phone, timezone) values
  ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-0000000000b1', 'View Shop',
   '00000000-0000-0000-0000-0000000000b4', '1 View St', 'Tel Aviv', '+972500000012', 'Asia/Jerusalem');
insert into business_hours (business_id, day_of_week, opens_at, closes_at) values
  ('00000000-0000-0000-0000-0000000000b5', 2, '09:00', '17:00');
insert into employees (id, business_id, profile_id, position_title) values
  ('00000000-0000-0000-0000-0000000000b6', '00000000-0000-0000-0000-0000000000b5',
   '00000000-0000-0000-0000-0000000000b1', 'Owner');
insert into services (id, employee_id, name, price, duration_minutes) values
  ('00000000-0000-0000-0000-0000000000b7', '00000000-0000-0000-0000-0000000000b6', 'Cut', 50, 30);
insert into appointments (client_profile_id, employee_id, service_id, slot, status, created_by) values
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b6',
   '00000000-0000-0000-0000-0000000000b7',
   tstzrange(now() + interval '3 days', now() + interval '3 days 30 minutes', '[)'), 'CONFIRMED',
   '00000000-0000-0000-0000-0000000000b2');

-- ---------------------------------------------------------------------------
-- employee_public_profiles — staff name and photo, readable by anyone
-- ---------------------------------------------------------------------------

set local role anon;
reset request.jwt.claims;

select is(
  (select full_name from employee_public_profiles where employee_id = '00000000-0000-0000-0000-0000000000b6'),
  'View Owner',
  'anon can read a staff member’s name through the view, though profiles itself is closed to them'
);

select is(
  (select avatar_url from employee_public_profiles where employee_id = '00000000-0000-0000-0000-0000000000b6'),
  'https://example.test/avatar.png',
  'anon can read a staff member’s photo'
);

-- Stronger than "returns no rows": anon has no SELECT grant on profiles at all, so the query is
-- refused at the privilege check before RLS is even consulted. The view is the only route.
select throws_ok(
  $$ select count(*) from profiles $$,
  '42501',
  null,
  'the underlying profiles table is not even readable by anon — the view is the only route'
);

-- The view must expose name and photo and nothing else. Asserting the column list rather than
-- individual absences is what makes this catch a *future* `select p.*`.
select set_eq(
  $$ select column_name::text from information_schema.columns
      where table_name = 'employee_public_profiles' $$,
  $$ values ('employee_id'),('business_id'),('profile_id'),('position_title'),('status'),
             ('full_name'),('avatar_url') $$,
  'employee_public_profiles exposes exactly the roster columns, never phone/date_of_birth/location'
);

-- ---------------------------------------------------------------------------
-- business_client_contacts — client name and phone, scoped to their business
-- ---------------------------------------------------------------------------

-- Client contact details are never public, so this view is granted to `authenticated` only —
-- anon is refused outright rather than being handed an empty set.
select throws_ok(
  $$ select count(*) from business_client_contacts $$,
  '42501',
  null,
  'anon cannot read client contacts at all — the view is not granted to them'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}';

select is(
  (select full_name from business_client_contacts where profile_id = '00000000-0000-0000-0000-0000000000b2'),
  'View Client',
  'the business a client booked with can read that client’s name'
);

select is(
  (select phone from business_client_contacts where profile_id = '00000000-0000-0000-0000-0000000000b2'),
  '+972500000099',
  'and their phone, which is the point of the view (§10.7)'
);

select set_eq(
  $$ select column_name::text from information_schema.columns
      where table_name = 'business_client_contacts' $$,
  $$ values ('profile_id'),('business_id'),('full_name'),('phone') $$,
  'business_client_contacts exposes exactly name and phone, never date_of_birth or location'
);

-- The scoping predicate is the entire security boundary here, since security_invoker = false
-- means profiles RLS is not consulted. An unrelated business must see nothing.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}';
select is(
  (select count(*)::int from business_client_contacts),
  0,
  'an unrelated business user sees no client contacts — the view’s WHERE clause is the boundary'
);

-- A client is not staff anywhere, so they see no contacts either, not even their own.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}';
select is(
  (select count(*)::int from business_client_contacts),
  0,
  'the client themselves sees no rows — this view is a staff-side projection only'
);

-- `reset request.jwt.claims` matters as much as the role switch here: the claims set above
-- persist, and protect_profile_privileged_columns() keys off auth.role() rather than the session
-- role — so without this it still sees an `authenticated` caller and refuses the promotion.
set local role postgres;
reset request.jwt.claims;
update profiles set account_type = 'ADMIN' where id = '00000000-0000-0000-0000-0000000000b3';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b3","role":"authenticated"}';
select is(
  (select count(*)::int from business_client_contacts where profile_id = '00000000-0000-0000-0000-0000000000b2'),
  1,
  'an admin can read client contacts, matching is_admin() in every other policy'
);

select * from finish();
rollback;
