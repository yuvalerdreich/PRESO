import type { CategoryIconId, LocalizedText } from '@/types/domain';

/**
 * Presentation for the seeded categories, keyed by **slug**.
 *
 * `categories` carries `name` and `slug` and nothing else — no icon, no translation columns. The
 * name it does carry is the admin-facing canonical label (0011_seed_categories.sql says so
 * outright), so the bilingual label and the icon a chip renders have to come from the app. Slug
 * is the key because `categories.id` is a per-environment `gen_random_uuid()`.
 *
 * An admin can create a category through the console at any time, and that one will have no
 * entry here — hence `categoryPresentation()` below falls back to the database's own name for
 * both languages rather than rendering a blank chip.
 */
const PRESENTATION: Record<string, { icon: CategoryIconId; name: LocalizedText }> = {
  beauty: { icon: 'scissors', name: { he: 'מספרות ומכוני יופי', en: 'Hair salons & beauty' } },
  cosmetics: { icon: 'sparkles', name: { he: 'קוסמטיקה וציפורניים', en: 'Cosmetics & nails' } },
  fitness: { icon: 'dumbbell', name: { he: 'כושר ופילאטיס', en: 'Fitness & pilates' } },
  clinics: { icon: 'stethoscope', name: { he: 'קליניקות וטיפולים', en: 'Clinics & treatments' } },
  lessons: { icon: 'graduation-cap', name: { he: 'שיעורים וייעוץ', en: 'Lessons & consulting' } },
};

const FALLBACK_ICON: CategoryIconId = 'sparkles';

export function categoryPresentation(
  slug: string,
  databaseName: string,
): { icon: CategoryIconId; name: LocalizedText } {
  return PRESENTATION[slug] ?? { icon: FALLBACK_ICON, name: { he: databaseName, en: databaseName } };
}
