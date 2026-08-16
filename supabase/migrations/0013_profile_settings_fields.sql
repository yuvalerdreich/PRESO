-- §12.36 — profile settings fields (location, date of birth), added for the new /me/profile
-- settings screen. Both nullable and self-editable by the owning profile under the existing
-- profiles_update RLS policy (0010_rls.sql) — protect_profile_privileged_columns() only locks
-- account_type/status, so neither the policy nor that trigger needs to change.
alter table profiles
  add column location      text null check (location is null or length(btrim(location)) between 2 and 100),
  add column date_of_birth date null check (date_of_birth is null or date_of_birth <= current_date);
