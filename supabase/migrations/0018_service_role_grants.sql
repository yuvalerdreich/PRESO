-- service_role table grants — a correction to 0010_rls.sql.
--
-- 0010's grants section ends with the claim that "`service_role` already has blanket access
-- (BYPASSRLS + its own default grants) and needs nothing here". That is **wrong**, and it was
-- wrong in the same way the paragraph immediately above it warns about: with
-- `auto_expose_new_tables` unset, a newly created table grants nothing to anyone, and that
-- applies to `service_role` exactly as it applies to `anon` and `authenticated`. 0010 checked
-- that empirically for the latter two and assumed it for the former.
--
-- Confirmed rather than assumed this time:
--
--   select grantee, count(*) from information_schema.role_table_grants
--    where table_schema = 'public' and privilege_type = 'SELECT' group by grantee;
--   -- anon 7 · authenticated 16 · postgres 16 · service_role 0
--
-- BYPASSRLS is real but irrelevant here: it exempts the role from row-level *policies*, and the
-- privilege check happens first. So every query through `lib/supabase/admin.ts` — the client
-- reserved for `app/api/webhooks/*` and `app/api/cron/*` (§1) — would have failed with a bare
-- `42501` the moment those endpoints were built. Nothing exercised that path until now, which is
-- exactly why it went unnoticed: the ESLint rule confining the import kept it unused.
--
-- This grants what Supabase's hosted default grants, so local and cloud agree.
--
-- Note on the function grant: 0010 revokes EXECUTE on the private helpers `_range_diff()` and
-- `_insert_appointment()` **from `public`**, to keep them off the documented RPC surface. Granting
-- them to `service_role` specifically does not undo that — `anon` and `authenticated` are still
-- excluded — and it matches the hosted default. `service_role` bypasses RLS wholesale anyway, so
-- withholding one function from it would be a gesture rather than a boundary.

grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

-- Tables added by later migrations would otherwise reintroduce the same gap.
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
