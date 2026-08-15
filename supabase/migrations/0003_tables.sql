-- The 14 application tables (TECHNICAL_DESIGN.md §3.2–§3.11), in FK dependency order.
-- Indexes (incl. the join_requests "one open request" unique index) live in
-- 0004_indexes.sql; the appointments exclusion constraint lives in 0005_constraints.sql —
-- both need extensions from 0001 already installed.

-- §3.2 profiles — mirrors auth.users 1:1, populated by a trigger on auth.users (0009_triggers.sql)
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text        not null check (length(btrim(full_name)) between 2 and 80),
  phone         text            null check (phone ~ '^\+?[0-9\-\s]{9,15}$'),
  account_type  account_type   not null,
  status        profile_status not null default 'ACTIVE',
  created_at    timestamptz    not null default now()
);

-- §3.3 categories
create table categories (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$')
);

-- §3.4 businesses. timezone/description/cancellation_window_hours are [+] additions,
-- decided in TECHNICAL_DESIGN.md §12.1–§12.3. timezone validity is checked by a trigger
-- (0009_triggers.sql), not a CHECK constraint — an invalid IANA name can't be validated
-- with a regex.
create table businesses (
  id                        uuid primary key default gen_random_uuid(),
  owner_profile_id          uuid not null references profiles(id) on delete restrict,
  name                      text not null check (length(btrim(name)) between 2 and 80),
  description               text     null check (length(description) <= 1000),
  category_id               uuid not null references categories(id) on delete restrict,
  address                   text not null check (length(btrim(address)) between 4 and 200),
  area                      text not null check (length(btrim(area)) between 2 and 60),
  phone                     text not null check (phone ~ '^\+?[0-9\-\s]{9,15}$'),
  timezone                  text not null default 'Asia/Jerusalem',
  photo_paths               text[] not null default '{}' check (array_length(photo_paths,1) is null
                                                              or array_length(photo_paths,1) <= 8),
  approval_policy           approval_policy not null default 'AUTO',
  cancellation_window_hours int  not null default 24 check (cancellation_window_hours between 0 and 168),
  status                    business_status not null default 'ACTIVE',
  created_at                timestamptz not null default now()
);

-- §3.5 business_hours — the outer boundary of all availability. No unique constraint on
-- (business_id, day_of_week): split shifts are legal. Same-day window overlap is rejected
-- in setOperatingHours (§9.3), not here — see TECHNICAL_DESIGN.md §12.19.
create table business_hours (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),   -- 0 = Sunday
  opens_at    time not null,
  closes_at   time not null,
  check (closes_at > opens_at)
);

-- §3.6 employees — a POSITION, not a person-record. A single-worker business still gets
-- exactly one row here, so scaling to more staff needs no migration.
create table employees (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references businesses(id) on delete cascade,
  profile_id     uuid not null references profiles(id)   on delete restrict,
  position_title text not null default 'Staff' check (length(btrim(position_title)) between 2 and 60),
  status         employee_status not null default 'ACTIVE',
  created_at     timestamptz not null default now(),
  unique (business_id, profile_id)
);

-- §3.7 employee_availability_rules — layered on top of business_hours.
create table employee_availability_rules (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references employees(id) on delete cascade,
  kind            availability_rule_kind not null,
  day_of_week     smallint null check (day_of_week between 0 and 6),
  starts_at       time     null,
  ends_at         time     null,
  effective_range tstzrange null,
  created_at      timestamptz not null default now(),

  check (
    (kind = 'WEEKLY_WINDOW' and day_of_week is not null
       and starts_at is not null and ends_at is not null and ends_at > starts_at)
 or (kind = 'EXCEPTION'     and effective_range is not null
       and starts_at is not null and ends_at is not null and ends_at > starts_at)
 or (kind in ('VACATION','BLOCK') and effective_range is not null)
  )
);

-- §3.8 services — owned by an EMPLOYEE, not a business. This is what makes availability
-- employee×service specific.
create table services (
  id               uuid primary key default gen_random_uuid(),
  employee_id      uuid not null references employees(id) on delete cascade,
  name             text not null check (length(btrim(name)) between 2 and 80),
  price            numeric(10,2) not null check (price >= 0),
  duration_minutes int not null check (duration_minutes between 5 and 480),
  buffer_minutes   int not null default 0 check (buffer_minutes between 0 and 120),
  status           service_status not null default 'ACTIVE',
  created_at       timestamptz not null default now()
);

-- §3.9 appointments — the exclusion constraint (appointments_no_overlap) is added in
-- 0005_constraints.sql, after btree_gist (0001) and this table both exist. There is no
-- direct INSERT/UPDATE path to this table from application code — RLS (0010_rls.sql)
-- grants no write privilege; book_appointment/cancel_appointment/reschedule_appointment
-- (0007_fn_booking.sql) are the only writers.
create table appointments (
  id                uuid primary key default gen_random_uuid(),
  client_profile_id uuid not null references profiles(id)  on delete restrict,
  employee_id       uuid not null references employees(id) on delete restrict,
  service_id        uuid not null references services(id)  on delete restrict,
  slot              tstzrange not null,
  status            appointment_status not null,
  created_by        uuid not null references profiles(id),
  created_at        timestamptz not null default now(),
  cancelled_at      timestamptz null,
  cancelled_by      uuid null references profiles(id),
  check (not isempty(slot)),
  check ((status = 'CANCELLED') = (cancelled_at is not null))
);

-- §3.10 waitlist_entries + waitlist_employee_targets. An entry with no target rows means
-- "any employee in the business". matched_at is a [+] addition (§12.11) so the cron sweep
-- can age a MATCHED entry.
create table waitlist_entries (
  id                uuid primary key default gen_random_uuid(),
  client_profile_id uuid not null references profiles(id)   on delete cascade,
  business_id       uuid not null references businesses(id) on delete cascade,
  service_id        uuid null     references services(id)   on delete cascade,
  from_ts           timestamptz not null,
  to_ts             timestamptz not null,
  status            waitlist_status not null default 'ACTIVE',
  matched_at        timestamptz null,
  created_at        timestamptz not null default now(),
  check (to_ts > from_ts)
);

create table waitlist_employee_targets (          -- models "any one of these employees"
  waitlist_entry_id uuid not null references waitlist_entries(id) on delete cascade,
  employee_id       uuid not null references employees(id)        on delete cascade,
  primary key (waitlist_entry_id, employee_id)
);

-- §3.11 join_requests, notifications, reports, audit_log
create table join_requests (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id)   on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  status      join_request_status not null default 'PENDING',
  decided_by  uuid null references profiles(id),
  decided_at  timestamptz null,
  created_at  timestamptz not null default now(),
  check ((status = 'PENDING') = (decided_at is null))
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  type       notification_type not null,
  payload    jsonb not null default '{}'::jsonb,
  read_at    timestamptz null,
  emailed_at timestamptz null,
  created_at timestamptz not null default now()
);

create table reports (
  id                  uuid primary key default gen_random_uuid(),
  reporter_profile_id uuid not null references profiles(id) on delete cascade,
  target_type         report_target_type not null,
  target_id           uuid not null,
  description         text not null check (length(btrim(description)) between 10 and 1000),
  status              report_status not null default 'OPEN',
  resolution_note     text null,
  created_at          timestamptz not null default now()
);

create table audit_log (
  id               uuid primary key default gen_random_uuid(),
  actor_profile_id uuid null references profiles(id) on delete set null,
  action           text not null,          -- e.g. 'business.suspend'
  entity           text not null,          -- e.g. 'businesses'
  entity_id        uuid null,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);
