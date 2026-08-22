-- Categories become fully DB-driven — both name and icon — removing the client-side slug→label
-- override table that used to live at src/lib/i18n/categories.ts (`categoryPresentation()`).
--
-- Until now `categories.name` was documented as "the admin-facing canonical label" (0011's own
-- comment), stored in English, with the bilingual Hebrew label the public UI actually rendered
-- supplied separately by app code, keyed on `slug`. That meant the UI was inventing part of what
-- it showed rather than only ever displaying what the backend handed it, and a category added
-- directly in the DB with no matching code entry (slug 'other') rendered in English regardless of
-- the rest of the page being Hebrew. Decided: the UI renders `categories.name` as-is, nothing else
-- — so `name` has to be the Hebrew label directly, and there is no more per-slug override.
--
-- Icon choice moves the same way. It was the other half of that same slug-keyed table, and had the
-- same failure mode: an admin-created category silently got a generic fallback icon forever. A new
-- `icon` column makes a category fully described by its own row. It stays constrained to the
-- finite set the UI actually has a Lucide component for (`CategoryIconId`, types/domain.ts) — that
-- id→component table is a rendering catalogue, not content, the same way a status enum maps to a
-- fixed badge color: adding a new icon to the catalogue is a code change, choosing which one an
-- existing category uses is now purely a data change.
alter table categories
  add column icon text not null default 'sparkles'
    check (icon in ('graduation-cap', 'stethoscope', 'dumbbell', 'sparkles', 'scissors'));

comment on column categories.icon is
  'Which Lucide icon (by id) the UI renders for this category — must match one the frontend '
  'catalogue actually has a component for (types/domain.ts CategoryIconId). Chosen per row so a '
  'newly added category is not silently stuck on a generic fallback.';

-- Existing rows (0011_seed_categories.sql's five, plus 'other' added later by hand) translated to
-- the Hebrew labels the UI already rendered via the now-removed app-code table, so this is a
-- content correction, not a new decision.
update categories set name = 'מספרות ומכוני יופי',   icon = 'scissors'        where slug = 'beauty';
update categories set name = 'קוסמטיקה וציפורניים',  icon = 'sparkles'        where slug = 'cosmetics';
update categories set name = 'כושר ופילאטיס',        icon = 'dumbbell'        where slug = 'fitness';
update categories set name = 'קליניקות וטיפולים',    icon = 'stethoscope'     where slug = 'clinics';
update categories set name = 'שיעורים וייעוץ',       icon = 'graduation-cap'  where slug = 'lessons';
update categories set name = 'אחר'                                            where slug = 'other';
