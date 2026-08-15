-- Every enum type in TECHNICAL_DESIGN.md §3.1. Values match ARCHITECTURE.md §8.1 and
-- drawio page 2 exactly — do not add or rename a value without updating both.

create type account_type            as enum ('BUSINESS','CLIENT','ADMIN');
create type profile_status          as enum ('ACTIVE','SUSPENDED');
create type business_status         as enum ('ACTIVE','SUSPENDED');
create type approval_policy         as enum ('AUTO','MANUAL');
create type employee_status         as enum ('ACTIVE','INACTIVE');
create type service_status          as enum ('ACTIVE','INACTIVE');
create type availability_rule_kind  as enum ('WEEKLY_WINDOW','EXCEPTION','VACATION','BLOCK');
create type appointment_status      as enum ('PENDING','CONFIRMED','CANCELLED');
create type waitlist_status         as enum ('ACTIVE','MATCHED','CLAIMED','EXPIRED');
create type join_request_status     as enum ('PENDING','APPROVED','REJECTED');
create type report_target_type      as enum ('BUSINESS','PROFILE','APPOINTMENT');
create type report_status           as enum ('OPEN','RESOLVED','DISMISSED');
create type notification_type       as enum (
  'JOIN_REQUEST_RECEIVED','JOIN_REQUEST_DECIDED',
  'APPOINTMENT_CREATED','APPOINTMENT_CONFIRMED','APPOINTMENT_REJECTED',
  'APPOINTMENT_CANCELLED','APPOINTMENT_RESCHEDULED',
  'WAITLIST_MATCHED'
);
