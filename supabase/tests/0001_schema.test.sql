-- Schema shape (TECHNICAL_DESIGN.md §3): extensions, enums, the 14 tables, the exclusion
-- constraint, and the seeded categories. Mechanical drift detection — if a future migration
-- accidentally renames/drops something these depend on, this fails loudly instead of the
-- app just breaking silently at runtime.
begin;
select plan(34);

-- §3.1 extensions
select has_extension('public', 'btree_gist', 'btree_gist is installed (0001, required by 0005''s exclusion constraint)');
select has_extension('public', 'pg_trgm', 'pg_trgm is installed (0001, fuzzy business search)');
select ok(
  exists (select 1 from pg_extension where extname = 'pgcrypto'),
  'pgcrypto is installed (0001; may already exist in the extensions schema by default)'
);

-- §3.1 enums — spot-check the two enums business logic branches on most
select enum_has_labels('appointment_status', array['PENDING','CONFIRMED','CANCELLED'], 'appointment_status has exactly the three §12.18-fixed labels');
select enum_has_labels('waitlist_status', array['ACTIVE','MATCHED','CLAIMED','EXPIRED'], 'waitlist_status has all four labels');
select enum_has_labels('account_type', array['BUSINESS','CLIENT','ADMIN'], 'account_type has all three labels');

-- §3.2–§3.11 — the 14 application tables exist
select has_table('public', t, t || ' table exists')
  from unnest(array[
    'profiles','categories','businesses','business_hours','employees',
    'employee_availability_rules','services','appointments',
    'waitlist_entries','waitlist_employee_targets','join_requests',
    'notifications','reports','audit_log'
  ]) as t;

-- §3.4 businesses — spot-check the §12.1–12.3 additions specifically, since those are the
-- columns TECHNICAL_DESIGN.md's own DDL diverges from ARCHITECTURE.md on
select has_column('public', 'businesses', 'timezone', 'businesses.timezone exists (§12.3)');
select col_default_is('public', 'businesses', 'timezone', 'Asia/Jerusalem', 'businesses.timezone defaults to Asia/Jerusalem');
select has_column('public', 'businesses', 'cancellation_window_hours', 'businesses.cancellation_window_hours exists (§12.2)');
select col_default_is('public', 'businesses', 'cancellation_window_hours', '24', 'cancellation_window_hours defaults to 24');
select has_column('public', 'businesses', 'payment_notes', 'businesses.payment_notes exists (§12.44)');
select col_is_null('public', 'businesses', 'payment_notes', 'payment_notes is nullable — a business need not state one');

-- §3.9 appointments — the exclusion constraint is THE guarantee (§3.9, §6.2)
select ok(
  exists (
    select 1 from pg_constraint
     where conname = 'appointments_no_overlap' and contype = 'x'
  ),
  'appointments_no_overlap is an EXCLUDE constraint'
);
select col_type_is('public', 'appointments', 'slot', 'tstzrange', 'appointments.slot is a tstzrange');

-- §3.12 — a couple of the GiST/functional indexes that only make sense if btree_gist loaded
select has_index('public', 'employee_availability_rules', 'rules_range_gist', 'rules_range_gist exists');
select has_index('public', 'waitlist_entries', 'waitlist_range_gist', 'waitlist_range_gist exists');
select has_index('public', 'join_requests', 'join_requests_one_open', 'join_requests_one_open exists (duplicate-request guard)');

-- §3.14 — RLS is enabled on all 14 tables (policies themselves are exercised in 0006)
select ok(
  (select bool_and(relrowsecurity) from pg_class
    where relname in (
      'profiles','categories','businesses','business_hours','employees',
      'employee_availability_rules','services','appointments',
      'waitlist_entries','waitlist_employee_targets','join_requests',
      'notifications','reports','audit_log'
    ) and relnamespace = 'public'::regnamespace),
  'row level security is enabled on all 14 tables'
);

-- 0011 — the curated category seed
select is(
  (select count(*)::int from categories), 5,
  '0011 seeded exactly 5 categories'
);
select ok(
  exists (select 1 from categories where slug = 'beauty'),
  'the beauty category slug matches the frontend mock (CLAUDE.md §8)'
);

select * from finish();
rollback;
