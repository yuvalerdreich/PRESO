-- Two display columns the built UI already renders but the schema could not feed.
--
-- Found while replacing the mock repositories with real queries: `EmployeeCard` renders an
-- employee photo and `EmployeeServiceList` renders a per-service description (both since the
-- first UI pass), but neither `profiles` nor `services` has a column behind them. The choice was
-- to add the columns or delete working, approved UI; §12.4 already set the precedent by adding
-- `businesses.description` for exactly this reason — the architecture's column list simply
-- predates the screens.
--
-- Both are nullable with no default, so every existing row stays valid and the UI falls back
-- (initials for a missing avatar, no description paragraph) rather than rendering "null".

-- avatar_url lives on `profiles`, not `employees`: a person keeps one photo across every
-- business they work at, and `employees` is a *position*, not a person-record (§3.6). Storing it
-- per-position would duplicate it for anyone holding two.
--
-- Self-editable under the existing profiles_update policy (0010_rls.sql), and outside
-- protect_profile_privileged_columns()'s locked set (account_type/status), so neither the policy
-- nor that trigger changes. Publicly readable is intended — it renders on the public booking
-- page — and profiles_select already scopes reads to own-row-or-admin, so the *query* joining it
-- for public display goes through employees, which anon can already read.
alter table profiles
  add column avatar_url text null
    check (avatar_url is null or length(btrim(avatar_url)) between 1 and 2048);

-- services.description mirrors businesses.description (§12.4): same purpose, same 1000-char
-- bound, written by the owning employee under the existing services policies.
alter table services
  add column description text null
    check (description is null or length(btrim(description)) <= 1000);

-- profiles grants SELECT to `authenticated` only (0010_rls.sql), and profiles_select restricts
-- rows to own-or-admin — so the public booking page cannot read an avatar by joining profiles.
-- Rather than widen that policy (which would expose full_name, phone and date_of_birth to anon),
-- avatar_url is surfaced through a view keyed on employees, which anon may already read in full.
create or replace view employee_public_profiles
with (security_invoker = false) as
  select
    e.id            as employee_id,
    e.business_id,
    e.profile_id,
    e.position_title,
    e.status,
    p.full_name,
    p.avatar_url
  from employees e
  join profiles  p on p.id = e.profile_id;

comment on view employee_public_profiles is
  'Public staff roster: the columns of profiles that are safe to expose for an employee '
  'position (name and photo only), joined to employees. security_invoker = false is '
  'deliberate — the view runs as its owner so it can read profiles rows the caller cannot, '
  'which is the whole point; it exposes no column beyond full_name and avatar_url.';

grant select on employee_public_profiles to anon, authenticated;
