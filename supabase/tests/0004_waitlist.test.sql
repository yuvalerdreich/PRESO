-- match_waitlist_for_slot() / sweep_waitlist_expiry() / claim_waitlist_entry()
-- (TECHNICAL_DESIGN.md §6.7, §12.31) — the same scenarios verified by hand while building
-- 0008_fn_waitlist.sql.
begin;
select plan(13);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'owner-wl@test.local', '{"account_type":"BUSINESS","full_name":"Owner E"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000f1', 'staff-wl@test.local', '{"account_type":"BUSINESS","full_name":"Staff F1"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000e2', 'client-wl2@test.local', '{"account_type":"CLIENT","full_name":"Client E2"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000e3', 'client-wl3@test.local', '{"account_type":"CLIENT","full_name":"Client E3"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000e4', 'client-wl4@test.local', '{"account_type":"CLIENT","full_name":"Client E4"}'::jsonb),
  ('00000000-0000-0000-0000-0000000000e5', 'client-wl5@test.local', '{"account_type":"CLIENT","full_name":"Client E5"}'::jsonb);

insert into categories (id, name, slug) values ('00000000-0000-0000-0000-0000000000e6', 'Barbers', 'barbers-wl');
insert into businesses (id, owner_profile_id, name, category_id, address, area, phone, timezone, approval_policy) values
  ('00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000e1',
   'Waitlist Test Shop', '00000000-0000-0000-0000-0000000000e6', '1 E St', 'Tel Aviv', '+972500000009', 'Asia/Jerusalem', 'AUTO');
insert into business_hours (business_id, day_of_week, opens_at, closes_at) values ('00000000-0000-0000-0000-0000000000e7', 2, '09:00', '17:00');
insert into employees (id, business_id, profile_id, position_title) values
  ('00000000-0000-0000-0000-0000000000e8', '00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000e1', 'Owner'),
  ('00000000-0000-0000-0000-0000000000e9', '00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000f1', 'Other Barber');
insert into employee_availability_rules (employee_id, kind, day_of_week, starts_at, ends_at) values
  ('00000000-0000-0000-0000-0000000000e8', 'WEEKLY_WINDOW', 2, '09:00', '17:00'),
  ('00000000-0000-0000-0000-0000000000e9', 'WEEKLY_WINDOW', 2, '09:00', '17:00');
insert into services (id, employee_id, name, price, duration_minutes, buffer_minutes) values
  ('00000000-0000-0000-0000-0000000000ea', '00000000-0000-0000-0000-0000000000e8', 'Cut', 50, 30, 0),
  ('00000000-0000-0000-0000-0000000000eb', '00000000-0000-0000-0000-0000000000e8', 'Color', 120, 60, 0),
  ('00000000-0000-0000-0000-0000000000fc', '00000000-0000-0000-0000-0000000000e9', 'Trim', 30, 30, 0);

select id into temp t_booked from book_appointment(
  '00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e8',
  '00000000-0000-0000-0000-0000000000ea', '2026-09-01T09:00:00+03', '00000000-0000-0000-0000-0000000000e2'
);

-- W1: no filters (any service, any employee) -> should match
insert into waitlist_entries (id, client_profile_id, business_id, service_id, from_ts, to_ts) values
  ('00000000-0000-0000-0000-0000000000ec', '00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000e7', null, '2026-09-01T00:00:00+03', '2026-09-01T23:59:59+03');
-- W2: same service as what gets freed -> should match
insert into waitlist_entries (id, client_profile_id, business_id, service_id, from_ts, to_ts) values
  ('00000000-0000-0000-0000-0000000000ed', '00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000ea', '2026-09-01T00:00:00+03', '2026-09-01T23:59:59+03');
-- W3: a DIFFERENT service -> should NOT match
insert into waitlist_entries (id, client_profile_id, business_id, service_id, from_ts, to_ts) values
  ('00000000-0000-0000-0000-0000000000ee', '00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000e7', '00000000-0000-0000-0000-0000000000eb', '2026-09-01T00:00:00+03', '2026-09-01T23:59:59+03');
-- W4: targets a DIFFERENT employee -> should NOT match
insert into waitlist_entries (id, client_profile_id, business_id, service_id, from_ts, to_ts) values
  ('00000000-0000-0000-0000-0000000000ef', '00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000e7', null, '2026-09-01T00:00:00+03', '2026-09-01T23:59:59+03');
insert into waitlist_employee_targets (waitlist_entry_id, employee_id) values ('00000000-0000-0000-0000-0000000000ef', '00000000-0000-0000-0000-0000000000e9');
-- W5: requested range does not overlap the freed slot -> should NOT match
insert into waitlist_entries (id, client_profile_id, business_id, service_id, from_ts, to_ts) values
  ('00000000-0000-0000-0000-0000000000f0', '00000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-0000000000e7', null, '2026-09-01T15:00:00+03', '2026-09-01T16:00:00+03');

update appointments set status = 'CANCELLED', cancelled_at = now(), cancelled_by = '00000000-0000-0000-0000-0000000000e1'
 where id = (select id from t_booked);
select match_waitlist_for_slot('00000000-0000-0000-0000-0000000000e8', tstzrange('2026-09-01T09:00:00+03','2026-09-01T09:30:00+03','[)'), '00000000-0000-0000-0000-0000000000ea');

select is((select status::text from waitlist_entries where id = '00000000-0000-0000-0000-0000000000ec'), 'MATCHED', 'no-filter entry (W1) is matched');
select is((select status::text from waitlist_entries where id = '00000000-0000-0000-0000-0000000000ed'), 'MATCHED', 'same-service entry (W2) is matched');
select is((select status::text from waitlist_entries where id = '00000000-0000-0000-0000-0000000000ee'), 'ACTIVE', 'different-service entry (W3) is not matched');
select is((select status::text from waitlist_entries where id = '00000000-0000-0000-0000-0000000000ef'), 'ACTIVE', 'different-employee-target entry (W4) is not matched');
select is((select status::text from waitlist_entries where id = '00000000-0000-0000-0000-0000000000f0'), 'ACTIVE', 'non-overlapping-range entry (W5) is not matched');

select is(
  (select payload->>'serviceId' from notifications where type = 'WAITLIST_MATCHED' and payload->>'waitlistEntryId' = '00000000-0000-0000-0000-0000000000ec'),
  '00000000-0000-0000-0000-0000000000ea', 'the WAITLIST_MATCHED notification carries serviceId (§12.31)'
);

-- sweep: W3 (still ACTIVE) has to_ts in the past -> EXPIRED
update waitlist_entries set from_ts = now() - interval '2 hours', to_ts = now() - interval '1 hour' where id = '00000000-0000-0000-0000-0000000000ee';
-- sweep: W1 (MATCHED, no filters) aged past the 60min claim window; e8 gets fully booked
-- below but e9's Trim service is untouched -> should release back to ACTIVE
update waitlist_entries set matched_at = now() - interval '61 minutes' where id = '00000000-0000-0000-0000-0000000000ec';
-- sweep: W2 (MATCHED, service=Cut, only offered by e8) also aged; once e8 is fully booked
-- there is no capacity left for Cut anywhere -> should EXPIRE
update waitlist_entries set matched_at = now() - interval '61 minutes' where id = '00000000-0000-0000-0000-0000000000ed';

do $$
declare v record;
begin
  for v in select starts_at from get_available_slots('00000000-0000-0000-0000-0000000000e8', '00000000-0000-0000-0000-0000000000ea', '2026-09-01T00:00:00+03', '2026-09-01T23:59:59+03')
  loop
    perform book_appointment('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e8', '00000000-0000-0000-0000-0000000000ea', v.starts_at, '00000000-0000-0000-0000-0000000000e1');
  end loop;
end $$;

select results_eq(
  $$ select expired, released from sweep_waitlist_expiry() $$,
  $$ values (2, 1) $$,
  'sweep: 2 expired (W3 time-based, W2 capacity-exhausted), 1 released (W1)'
);
select is((select status::text from waitlist_entries where id = '00000000-0000-0000-0000-0000000000ec'), 'ACTIVE', 'W1 released back to ACTIVE (Trim capacity still exists)');
select is((select status::text from waitlist_entries where id = '00000000-0000-0000-0000-0000000000ed'), 'EXPIRED', 'W2 expired (no Cut capacity left anywhere)');

-- claim_waitlist_entry (§12.31): a winning claim books the appointment and marks the entry
-- CLAIMED; a losing claim (slot already taken) leaves no appointment, re-raises the
-- original error, and reverts the entry to ACTIVE rather than leaving it stuck MATCHED.
update waitlist_entries set status = 'MATCHED' where id = '00000000-0000-0000-0000-0000000000ef';
select id into temp t_claimed from claim_waitlist_entry(
  '00000000-0000-0000-0000-0000000000ef', '00000000-0000-0000-0000-0000000000e9',
  '00000000-0000-0000-0000-0000000000fc', '2026-09-01T09:00:00+03', '00000000-0000-0000-0000-0000000000e5'
);
select is(
  (select status::text from waitlist_entries where id = '00000000-0000-0000-0000-0000000000ef'),
  'CLAIMED', 'a winning claim marks the entry CLAIMED'
);
select ok(
  (select count(*) = 1 from appointments where id = (select id from t_claimed)),
  'a winning claim actually created the appointment'
);

insert into waitlist_entries (id, client_profile_id, business_id, service_id, from_ts, to_ts, status, matched_at) values
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-0000000000e7',
   '00000000-0000-0000-0000-0000000000fc', '2026-09-01T00:00:00+03', '2026-09-01T23:59:59+03', 'MATCHED', now());
-- someone else takes the same slot first
select book_appointment('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000e9', '00000000-0000-0000-0000-0000000000fc', '2026-09-01T10:00:00+03', '00000000-0000-0000-0000-0000000000e2');
select throws_like(
  $$ select claim_waitlist_entry('00000000-0000-0000-0000-0000000000f2','00000000-0000-0000-0000-0000000000e9','00000000-0000-0000-0000-0000000000fc','2026-09-01T10:00:00+03','00000000-0000-0000-0000-0000000000e4') $$,
  '%slot_unavailable%',
  'a losing claim re-raises the original booking error'
);
-- §12.31 (amended): Postgres can't partially commit within one transaction, so a losing
-- claim's re-raised exception rolls back any compensating write too — the entry is left
-- MATCHED, not synchronously reverted. sweep_waitlist_expiry() (tested above) is the actual
-- release mechanism, on its normal 60-minute cadence.
select is(
  (select status::text from waitlist_entries where id = '00000000-0000-0000-0000-0000000000f2'),
  'MATCHED', 'a losing claim leaves the entry MATCHED — release is sweep_waitlist_expiry''s job, not a synchronous revert'
);

select * from finish();
rollback;
