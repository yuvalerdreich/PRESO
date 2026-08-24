-- Companion to 0036: 'GENERAL' now exists on report_target_type. A GENERAL report has no target —
-- it is "I hit a problem", not "I hit a problem with X" — so target_id must become nullable, paired
-- by a CHECK the same shape join_requests already uses for its own nullable-iff-status column
-- (0003_tables.sql: `check ((status = 'PENDING') = (decided_at is null))`).

alter table reports alter column target_id drop not null;

alter table reports add constraint reports_target_id_null_iff_general
  check ((target_type = 'GENERAL') = (target_id is null));
