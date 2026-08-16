-- Development seed (TECHNICAL_DESIGN.md §1's file plan: "dev seed: categories, demo business,
-- demo staff"). Applied automatically after migrations by `supabase db reset`
-- (config.toml [db.seed]).
--
-- Categories themselves are NOT here — they are a migration (0011_seed_categories.sql), because
-- they are reference data the application depends on rather than demo content. Everything below
-- is demo content and is joined to those categories **by slug**, never by id: `categories.id` is
-- a per-environment `gen_random_uuid()`, so local, CI and the hosted project all disagree on it.
--
-- Business ids are pinned to the same UUIDs the old mock fixture used, so URLs and tests written
-- against the mock keep working now that the data is real.
--
-- Idempotent throughout (`on conflict do nothing`), so this can be re-run against the hosted
-- project without duplicating anyone.

-- ============================================================================
-- 1. Demo accounts
-- ============================================================================
-- profiles are NOT inserted directly: handle_new_user() (0009_triggers.sql) mirrors every
-- auth.users row into profiles, and inserting both would conflict with it. full_name / phone /
-- account_type are passed through raw_user_meta_data, exactly as a real sign-up does.
--
-- The password hash and the auth.identities row below are what make these accounts genuinely
-- sign-in-able ("demo-password"). Two things here are non-obvious and were both found by
-- actually attempting a login rather than by reading the schema:
--
--   1. Without a matching auth.identities row, GoTrue rejects a password login even when
--      auth.users looks complete.
--   2. `confirmation_token`, `recovery_token`, `email_change` and `email_change_token_new` are
--      nullable in the table but **not** in GoTrue's Go structs, which scan them into plain
--      strings. Leaving them NULL makes every login fail with an opaque
--      `{"code":500,"error_code":"unexpected_failure","msg":"Database error querying schema"}`
--      that says nothing about which column is at fault. They must be '' — not NULL.
--      (The other four token columns already default to '' in the table itself.)

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000',
  d.id, 'authenticated', 'authenticated', d.email,
  crypt('demo-password', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('full_name', d.full_name, 'phone', d.phone, 'account_type', d.account_type),
  now(), now(),
  '', '', '', ''
from (values
  ('d0000000-0000-4000-8000-000000000001'::uuid, 'zohar@demo.local',  'זוהר לוי',   '03-6001122',  'BUSINESS'),
  ('d0000000-0000-4000-8000-000000000002'::uuid, 'miya@demo.local',   'מיה כהן',    '03-6001123',  'BUSINESS'),
  ('d0000000-0000-4000-8000-000000000003'::uuid, 'dana@demo.local',   'דנה כהן',    '09-9556677',  'BUSINESS'),
  ('d0000000-0000-4000-8000-000000000004'::uuid, 'lior@demo.local',   'ליאור שדה',  '09-9556678',  'BUSINESS'),
  ('d0000000-0000-4000-8000-000000000005'::uuid, 'idan@demo.local',   'עידן ברק',   '04-8112233',  'BUSINESS'),
  ('d0000000-0000-4000-8000-000000000006'::uuid, 'client@demo.local', 'נועה גולן',  '052-1234567', 'CLIENT')
) as d(id, email, full_name, phone, account_type)
on conflict (id) do nothing;

insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at)
select
  gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now()
from auth.users u
where u.email like '%@demo.local'
on conflict (provider, provider_id) do nothing;

-- avatar_url is a 0015 column. Absolute URLs are used here rather than Storage paths — see the
-- note on photo_paths below.
update profiles set avatar_url = v.avatar_url
from (values
  ('d0000000-0000-4000-8000-000000000001'::uuid, 'https://i.pravatar.cc/96?img=51'),
  ('d0000000-0000-4000-8000-000000000002'::uuid, 'https://i.pravatar.cc/96?img=47'),
  ('d0000000-0000-4000-8000-000000000003'::uuid, 'https://i.pravatar.cc/96?img=32'),
  ('d0000000-0000-4000-8000-000000000004'::uuid, 'https://i.pravatar.cc/96?img=45'),
  ('d0000000-0000-4000-8000-000000000005'::uuid, 'https://i.pravatar.cc/96?img=12')
) as v(id, avatar_url)
where profiles.id = v.id and profiles.avatar_url is null;

-- ============================================================================
-- 2. Businesses
-- ============================================================================
-- photo_paths is documented as Supabase Storage paths, but the seed stores absolute URLs so the
-- demo has real imagery without anyone having to upload objects first. The query layer accepts
-- either: a value that already parses as an absolute URL is passed through, anything else is
-- resolved through Storage's public-URL builder.
--
-- Glow Clinic is MANUAL on purpose — it is the only business here whose bookings land PENDING,
-- so the booking flow can demonstrate both outcomes (§6.2 step 5). The rest are AUTO.

insert into businesses (
  id, owner_profile_id, name, description, category_id, address, area, phone,
  timezone, photo_paths, approval_policy, cancellation_window_hours
)
select
  b.id, b.owner_profile_id, b.name, b.description, c.id, b.address, b.area, b.phone,
  'Asia/Jerusalem', array[b.photo_url], b.approval_policy::approval_policy, b.cancellation_window_hours
from (values
  ('b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001'::uuid, 'd0000000-0000-4000-8000-000000000001'::uuid,
   'Studio Zohar - מספרת זוהר',
   'סטודיו לעיצוב שיער, כימיקלים מתקדמים, גוונים ותספורות גברים ונשים.',
   'beauty', 'רחוב דיזנגוף 142, תל אביב', 'תל אביב', '03-6001122',
   'https://picsum.photos/seed/studio-zohar/640/480', 'AUTO', 24),

  ('b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1002'::uuid, 'd0000000-0000-4000-8000-000000000003'::uuid,
   'Glow Clinic קליניקת אסתטיקה',
   'טיפולי פנים מתקדמים, מניקור פדיקור רפואי ואסתטיקה פרא-רפואית.',
   'cosmetics', 'שדרות אבא אבן 8, הרצליה', 'הרצליה', '09-9556677',
   'https://picsum.photos/seed/glow-clinic/640/480', 'MANUAL', 48),

  ('b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1000'::uuid, 'd0000000-0000-4000-8000-000000000005'::uuid,
   'Apex Fitness סטודיו כושר ופילאטיס',
   'אימונים אישיים, שיקום תנועתי ופילאטיס מכשירים אחד על אחד.',
   'fitness', 'דרך יפו 45, חיפה', 'חיפה', '04-8112233',
   'https://picsum.photos/seed/apex-fitness/640/480', 'AUTO', 12)
) as b(id, owner_profile_id, name, description, category_slug, address, area, phone,
       photo_url, approval_policy, cancellation_window_hours)
join categories c on c.slug = b.category_slug
on conflict (id) do nothing;

-- ============================================================================
-- 3. Opening hours
-- ============================================================================
-- Sunday(0)–Thursday(4) full days, Friday(5) short, Saturday(6) closed — the Israeli working
-- week, and the same shape the old availability mock stood in for with "Saturdays are closed".
-- A closed day is the *absence* of a row, not a row with equal times (the DDL's
-- `closes_at > opens_at` CHECK forbids the latter anyway).

insert into business_hours (business_id, day_of_week, opens_at, closes_at)
select b.id, d.day_of_week, d.opens_at::time, d.closes_at::time
from businesses b
cross join lateral (values
  (0, '09:00', '19:00'), (1, '09:00', '19:00'), (2, '09:00', '19:00'),
  (3, '09:00', '19:00'), (4, '09:00', '19:00'), (5, '09:00', '14:00')
) as d(day_of_week, opens_at, closes_at)
where b.id = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001'
  and not exists (select 1 from business_hours bh where bh.business_id = b.id);

insert into business_hours (business_id, day_of_week, opens_at, closes_at)
select b.id, d.day_of_week, d.opens_at::time, d.closes_at::time
from businesses b
cross join lateral (values
  (0, '10:00', '20:00'), (1, '10:00', '20:00'), (2, '10:00', '20:00'),
  (3, '10:00', '20:00'), (4, '10:00', '20:00'), (5, '09:00', '13:00')
) as d(day_of_week, opens_at, closes_at)
where b.id = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1002'
  and not exists (select 1 from business_hours bh where bh.business_id = b.id);

-- Apex opens early and closes late — a gym, and a deliberately different shape so the
-- availability engine visibly produces different grids per business rather than one house style.
insert into business_hours (business_id, day_of_week, opens_at, closes_at)
select b.id, d.day_of_week, d.opens_at::time, d.closes_at::time
from businesses b
cross join lateral (values
  (0, '06:00', '22:00'), (1, '06:00', '22:00'), (2, '06:00', '22:00'),
  (3, '06:00', '22:00'), (4, '06:00', '22:00'), (5, '07:00', '15:00'), (6, '08:00', '14:00')
) as d(day_of_week, opens_at, closes_at)
where b.id = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1000'
  and not exists (select 1 from business_hours bh where bh.business_id = b.id);

-- ============================================================================
-- 4. Employees — a *position*, one row per person per business (§3.6)
-- ============================================================================

insert into employees (id, business_id, profile_id, position_title)
values
  ('e0000000-0000-4000-8000-000000000001', 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001',
   'd0000000-0000-4000-8000-000000000001', 'מעצב שיער ראשי ומנהל'),
  ('e0000000-0000-4000-8000-000000000002', 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001',
   'd0000000-0000-4000-8000-000000000002', 'מומחית גוונים וכימיקלים'),
  ('e0000000-0000-4000-8000-000000000003', 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1002',
   'd0000000-0000-4000-8000-000000000003', 'קוסמטיקאית רפואית'),
  ('e0000000-0000-4000-8000-000000000004', 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1002',
   'd0000000-0000-4000-8000-000000000004', 'מניקוריסטית'),
  ('e0000000-0000-4000-8000-000000000005', 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1000',
   'd0000000-0000-4000-8000-000000000005', 'מאמן אישי')
on conflict (id) do nothing;

-- ============================================================================
-- 5. Working windows
-- ============================================================================
-- Intersected with business_hours by get_available_slots(), never unioned — a window outside
-- opening hours is legal but yields nothing (§9.3). The windows below are deliberately
-- *different per employee* so that picking a different staff member visibly changes the
-- calendar, which is the behaviour §12.9 and PDF §8 rule 9 are about.

insert into employee_availability_rules (employee_id, kind, day_of_week, starts_at, ends_at)
select r.employee_id::uuid, 'WEEKLY_WINDOW', d.day, r.starts_at::time, r.ends_at::time
from (values
  -- Zohar: the owner, works the full week including Friday mornings.
  ('e0000000-0000-4000-8000-000000000001', '{0,1,2,3,4,5}', '09:00', '19:00'),
  -- Miya: later start, no Fridays.
  ('e0000000-0000-4000-8000-000000000002', '{0,1,2,3,4}',   '11:00', '19:00'),
  -- Dana: mornings only.
  ('e0000000-0000-4000-8000-000000000003', '{0,1,2,3,4}',   '10:00', '15:00'),
  -- Lior: afternoons and Friday mornings.
  ('e0000000-0000-4000-8000-000000000004', '{0,2,4,5}',     '13:00', '20:00'),
  -- Idan: early gym shifts, six days a week.
  ('e0000000-0000-4000-8000-000000000005', '{0,1,2,3,4,5,6}', '06:00', '14:00')
) as r(employee_id, days, starts_at, ends_at)
cross join lateral unnest(r.days::smallint[]) as d(day)
where not exists (
  select 1 from employee_availability_rules ear
   where ear.employee_id = r.employee_id::uuid and ear.kind = 'WEEKLY_WINDOW'
);

-- ============================================================================
-- 6. Services — owned by an employee, not a business (§3.8)
-- ============================================================================
-- Two employees at Studio Zohar both offer "תספורת ועיצוב שיער" at the same price: the same
-- service name existing twice under different owners is the normal case, not a duplicate, and
-- it exercises the rule that a client only ever sees the *selected* employee's list (§8 rule 8).

insert into services (id, employee_id, name, description, price, duration_minutes, buffer_minutes)
values
  ('50000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
   'עיצוב זקן וגילוח מסורתי', 'פיסול זקן, מגבות חמות וטיפוח עור הפנים.', 70.00, 20, 5),
  ('50000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000001',
   'תספורת ועיצוב שיער (גברים/נשים)', 'חפיפה מפנקת, תספורת מותאמת אישית ועיצוב בפן או חומר עיצוב.', 120.00, 30, 10),
  ('50000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000001',
   'פראפארט ופליקס לשיקום השיער', 'טיפול עמוק לשיער פגום עם חומצות אמינו.', 180.00, 45, 10),
  ('50000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000002',
   'גוונים וצבע אורגני מקצועי', 'טכניקת בליאז''/גוונים מקיפה כולל טיפול שיקום וברק.', 380.00, 90, 15),
  ('50000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000002',
   'תספורת ועיצוב שיער (גברים/נשים)', 'חפיפה מפנקת, תספורת מותאמת אישית ועיצוב בפן או חומר עיצוב.', 120.00, 30, 10),
  ('50000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000002',
   'טיפול קרטין להחלקת שיער', 'החלקה מקצועית להארכת חיי הסטיילינג והפחתת נפח.', 320.00, 75, 15),
  ('50000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000003',
   'טיפול פנים מתקדם', 'ניקוי עמוק, פילינג ומסכה מותאמים אישית לסוג העור.', 250.00, 50, 10),
  ('50000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000004',
   'מניקור פדיקור רפואי', 'טיפול רפואי לציפורניים ולעור סביבן, כולל הסרת עור קשה.', 180.00, 45, 10),
  ('50000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000005',
   'אימון אישי', 'אימון פרטני מותאם למטרות שלך, כולל בניית תוכנית עבודה.', 150.00, 60, 10)
on conflict (id) do nothing;

-- ============================================================================
-- 7. One booked appointment and one waitlist entry for the demo client
-- ============================================================================
-- Dated relative to now() so the demo never goes stale, and pinned to the next Monday (dow 1,
-- 7–13 days out) so it always lands inside every employee's working window and never on the
-- closed Saturday. Inserted directly rather than through book_appointment(): the RPC is the only
-- write path for the *application*, but the seed runs as the table owner and this row is fixture
-- data, not a booking anyone made. The exclusion constraint still applies.

insert into appointments (client_profile_id, employee_id, service_id, slot, status, created_by)
select
  'd0000000-0000-4000-8000-000000000006',
  'e0000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000002',
  tstzrange(
    (next_monday + time '11:30') at time zone 'Asia/Jerusalem',
    (next_monday + time '12:00') at time zone 'Asia/Jerusalem',
    '[)'
  ),
  'CONFIRMED',
  'd0000000-0000-4000-8000-000000000006'
from (
  select (current_date + (((1 - extract(dow from current_date)::int + 7) % 7) + 7))::date as next_monday
) as d
where not exists (
  select 1 from appointments where client_profile_id = 'd0000000-0000-4000-8000-000000000006'
);

-- An ACTIVE waitlist entry targeting a specific employee at the MANUAL-approval business, so the
-- waitlist screens have something to show and the matcher has something to find when a slot at
-- Glow Clinic frees up.
with entry as (
  insert into waitlist_entries (id, client_profile_id, business_id, service_id, from_ts, to_ts)
  select
    'a0000000-0000-4000-8000-000000000001',
    'd0000000-0000-4000-8000-000000000006',
    'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1002',
    '50000000-0000-4000-8000-000000000007',
    date_trunc('day', now()) + interval '1 day',
    date_trunc('day', now()) + interval '15 days'
  where not exists (select 1 from waitlist_entries where id = 'a0000000-0000-4000-8000-000000000001')
  returning id
)
insert into waitlist_employee_targets (waitlist_entry_id, employee_id)
select entry.id, 'e0000000-0000-4000-8000-000000000003' from entry
on conflict do nothing;
