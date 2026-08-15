-- Extensions required by the application schema (TECHNICAL_DESIGN.md §3.1).
--
-- btree_gist  — REQUIRED for appointments_no_overlap (0005_constraints.sql) and for the
--               GiST indexes on employee_availability_rules/waitlist_entries (0004_indexes.sql)
--               that mix a uuid equality column with a range column in one index.
-- pgcrypto    — gen_random_uuid(), used as the default for every table's uuid primary key.
-- pg_trgm     — fuzzy business-name search (businesses_name_trgm, 0004_indexes.sql).
create extension if not exists btree_gist;
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
