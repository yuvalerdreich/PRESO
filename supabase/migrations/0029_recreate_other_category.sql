-- Re-creates the 'other' category, which turned out to be missing from hosted after
-- 0028_categories_db_driven.sql shipped: `select * from categories where slug = 'other'` returned
-- no rows, `select count(*) from categories` was 5 instead of the expected 6. `categories` carries
-- no audit_log trigger, so there is no record of when or how the row was removed — 0028 itself only
-- ever ran `update ... where slug = 'other'`, never a delete, so this is not that migration undoing
-- itself. Re-added at the user's request, this time already in Hebrew and with an icon, consistent
-- with every other row after 0028 (idempotent guard in case the original row reappears some other
-- way before this runs).
insert into categories (name, slug, icon)
select 'אחר', 'other', 'sparkles'
where not exists (select 1 from categories where slug = 'other');
