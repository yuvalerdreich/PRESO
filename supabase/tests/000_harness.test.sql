-- Proves the pgTAP runner works: extensions load, assertions report, and the
-- plan count is enforced. If this fails, no other database test result means
-- anything.
begin;
select plan(2);

select has_extension('extensions', 'pgtap', 'pgTAP is installed');

-- btree_gist arrives in migration 0001_extensions.sql, installed (like pg_trgm) into the
-- `public` schema — `pgcrypto` lands in `extensions` instead because Supabase's own
-- baseline already installs it there and `create extension if not exists` is a no-op.
select has_extension('public', 'btree_gist', 'btree_gist is installed (migration 0001)');

select * from finish();
rollback;
