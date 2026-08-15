-- btree, GiST and trigram indexes (TECHNICAL_DESIGN.md §3.12). The appointments_no_overlap
-- exclusion "index" is created in 0005_constraints.sql, not here, because it doubles as a
-- correctness constraint and needs to be visibly grouped with the other CHECK-equivalents.

-- appointments
create index appointments_client_idx  on appointments (client_profile_id, status);   -- /me/appointments
create index appointments_service_idx on appointments (service_id);                  -- dashboard filter by service

-- business_hours
create index business_hours_idx on business_hours (business_id, day_of_week);        -- availability window lookup

-- employee_availability_rules
create index rules_employee_idx on employee_availability_rules (employee_id, kind);  -- rule lookup
create index rules_range_gist   on employee_availability_rules
  using gist (employee_id, effective_range);                                         -- vacation/block/exception subtraction

-- services
create index services_employee_idx on services (employee_id, status);                -- employee's service list

-- businesses
create index businesses_category_idx on businesses (category_id, status);            -- search by category
create index businesses_area_idx     on businesses (area);                           -- search by area
create index businesses_name_trgm    on businesses using gin (name gin_trgm_ops);     -- fuzzy `q` search

-- waitlist_entries
create index waitlist_active_idx on waitlist_entries (business_id, status);          -- matcher candidate scan
create index waitlist_range_gist on waitlist_entries
  using gist (tstzrange(from_ts, to_ts));                                            -- matcher range overlap

-- notifications
create index notifications_unread_idx  on notifications (profile_id, created_at desc) where read_at is null;   -- unread badge
create index notifications_unsent_idx  on notifications (created_at) where emailed_at is null;                 -- email dispatch retry

-- join_requests — a UNIQUE index, not just a perf index: it enforces "at most one open
-- request per person per business" (TECHNICAL_DESIGN.md §3.11), the duplicate-request guard.
create unique index join_requests_one_open
  on join_requests (profile_id, business_id) where (status = 'PENDING');
