-- Requested change: a general "report a problem" entry point in the nav sidebar ("נתקלת בבעיה?
-- לחץ לדיווח"), not scoped to any business/profile/appointment. §3.11's report_target_type was
-- BUSINESS/PROFILE/APPOINTMENT only, which has no member for "I hit a problem with the site in
-- general" — 0037 makes target_id nullable to match. Split into its own migration/transaction for
-- the same reason 0030/0033 were split from the migration that actually uses the new value:
-- Postgres forbids using a freshly added enum value in the transaction that added it.

alter type report_target_type add value if not exists 'GENERAL';
