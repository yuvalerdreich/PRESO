-- Proves the pgTAP runner works: extensions load, assertions report, and the
-- plan count is enforced. If this fails, no other database test result means
-- anything.
begin;
select plan(2);

select has_extension('extensions', 'pgtap', 'pgTAP is installed');

-- btree_gist arrives in migration 0001 (F1). Asserting its ABSENCE here keeps
-- this harness test honest about what the schema currently contains, and this
-- line flips to `has_extension` when F1 lands.
select ok(
  not exists (select 1 from pg_extension where extname = 'btree_gist'),
  'btree_gist is not installed yet — it arrives with migration 0001'
);

select * from finish();
rollback;
