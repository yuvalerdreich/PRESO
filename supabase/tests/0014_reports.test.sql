-- General ("problem with the site, not with any one business/profile/appointment") reports
-- (§12.76; 0036_report_target_type_general.sql, 0037_general_reports.sql) — the nav sidebar's
-- "נתקלת בבעיה? לחץ לדיווח" button files these. `reports.target_id` carries no foreign key
-- (§3.11, polymorphic across businesses/profiles/appointments) so this file needs no real
-- business/employee fixtures to exercise it — a bare uuid stands in for a BUSINESS target.
begin;
select plan(8);

set local role postgres;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000101', 'reporter1@test.local', '{"account_type":"CLIENT","full_name":"Reporter One"}'::jsonb),
  ('00000000-0000-0000-0000-000000000102', 'reporter2@test.local', '{"account_type":"CLIENT","full_name":"Reporter Two"}'::jsonb),
  ('00000000-0000-0000-0000-000000000103', 'reports-admin@test.local', '{"account_type":"CLIENT","full_name":"Reports Admin"}'::jsonb);
update profiles set account_type = 'ADMIN' where id = '00000000-0000-0000-0000-000000000103';

-- ---------------------------------------------------------------------------
-- The CHECK constraint: target_id is null iff the type is GENERAL
-- ---------------------------------------------------------------------------

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}';

select lives_ok(
  $$ insert into reports (id, reporter_profile_id, target_type, target_id, description)
     values ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000101',
             'GENERAL', null, 'the site felt slow when booking') $$,
  'a GENERAL report with no target_id is accepted'
);

select throws_ok(
  $$ insert into reports (id, reporter_profile_id, target_type, target_id, description)
     values ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000101',
             'BUSINESS', null, 'this business never confirmed my appointment') $$,
  '23514',
  'new row for relation "reports" violates check constraint "reports_target_id_null_iff_general"',
  'a non-GENERAL report still requires a target_id'
);

select throws_ok(
  $$ insert into reports (id, reporter_profile_id, target_type, target_id, description)
     values ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000101',
             'GENERAL', '00000000-0000-0000-0000-000000000999', 'general issue with a target attached') $$,
  '23514',
  'new row for relation "reports" violates check constraint "reports_target_id_null_iff_general"',
  'a GENERAL report cannot carry a target_id'
);

-- ---------------------------------------------------------------------------
-- RLS on the new row: reporter + admin only, same policy the typed reports already have
-- ---------------------------------------------------------------------------

select is(
  (select count(*)::int from reports where id = '00000000-0000-0000-0000-000000000104'),
  1,
  'the reporter can see their own GENERAL report'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated"}';
select is(
  (select count(*)::int from reports where id = '00000000-0000-0000-0000-000000000104'),
  0,
  'a different, non-admin user cannot see someone else''s report'
);

set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated"}';
select is(
  (select count(*)::int from reports where id = '00000000-0000-0000-0000-000000000104'),
  1,
  'an admin can see any report, GENERAL included'
);

-- A non-admin's UPDATE is filtered to zero rows by RLS, not an error (the trap CLAUDE.md §8
-- already flags) — the report stays OPEN.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}';
update reports set status = 'RESOLVED' where id = '00000000-0000-0000-0000-000000000104';

set local role postgres;
reset request.jwt.claims;
select is(
  (select status from reports where id = '00000000-0000-0000-0000-000000000104'),
  'OPEN',
  'the reporter cannot resolve their own report — only an admin can'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000103","role":"authenticated"}';
update reports set status = 'RESOLVED', resolution_note = 'not reproducible' where id = '00000000-0000-0000-0000-000000000104';

set local role postgres;
reset request.jwt.claims;
select is(
  (select status from reports where id = '00000000-0000-0000-0000-000000000104'),
  'RESOLVED',
  'an admin can resolve a GENERAL report'
);

select * from finish();
rollback;
