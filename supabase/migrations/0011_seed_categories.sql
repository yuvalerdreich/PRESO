-- The curated category list (TECHNICAL_DESIGN.md §1: "the curated category list"),
-- matching the 5 categories already established in the mock/demo layer
-- (src/lib/discovery/mock-repository.ts, CLAUDE.md §8) so real data lines up with what the
-- UI already renders and what tests/unit/discovery-repository.test.ts already asserts
-- against, rather than introducing a second, disconnected set.
--
-- `name` is the admin-facing canonical label — categories are "curated by admin" (§3.3),
-- and this table has no i18n columns. The bilingual display names the public UI actually
-- renders come from the app's own i18n layer (src/lib/i18n/translations.ts), keyed by
-- `slug`, which is why slugs below match the mock's category ids ('beauty', 'cosmetics', …)
-- exactly — that's the key the frontend will look up translations and icons by once this
-- table replaces the mock.
insert into categories (name, slug) values
  ('Hair salons & beauty', 'beauty'),
  ('Cosmetics & nails',    'cosmetics'),
  ('Fitness & pilates',    'fitness'),
  ('Clinics & treatments', 'clinics'),
  ('Lessons & consulting', 'lessons');
