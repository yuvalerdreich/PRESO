-- claim_business_account_type() (TECHNICAL_DESIGN.md §12.34, 0012_fn_account.sql) — the
-- post-OAuth /signup/choose-role upgrade path. Uses auth.uid() directly (not an explicit
-- actor parameter like the booking RPCs) since it's called straight from the browser client
-- with no server-side actor-resolution layer in between; these assertions simulate that via
-- request.jwt.claims the same way 0006_rls.test.sql does.
begin;
select plan(3);

set local role postgres;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'client-acct@test.local', '{"account_type":"CLIENT","full_name":"Client E1"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000e2', 'client-untouched@test.local', '{"account_type":"CLIENT","full_name":"Client E2"}'::jsonb);

-- 1. a CLIENT calling as themselves flips to BUSINESS
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}';
select is(
  (select account_type::text from claim_business_account_type()),
  'BUSINESS', 'a CLIENT caller upgrades their own profile to BUSINESS'
);

-- 2. calling it again (now already BUSINESS) is refused
select throws_like(
  $$ select claim_business_account_type() $$,
  '%not_found%',
  'claiming again once already BUSINESS raises not_found'
);

-- 3. a different, unrelated CLIENT profile was never touched
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000e2","role":"authenticated"}';
select is(
  (select account_type::text from profiles where id = '00000000-0000-0000-0000-0000000000e2'),
  'CLIENT', 'auth.uid() scoping means only the caller''s own row is ever affected'
);

select * from finish();
rollback;
