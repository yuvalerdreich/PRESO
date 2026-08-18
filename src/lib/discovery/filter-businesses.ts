import type { BusinessSummary, Category } from '@/types/domain';
import type { Locale } from '@/lib/i18n/types';

/**
 * The home page's search, run in the browser over the already-fetched grid — the same shape as
 * `/businesses`' search box, and the reason searching no longer navigates anywhere (§12.43).
 *
 * The fields it matches are exactly the ones the placeholder promises: business name, owner or
 * staff name, city, and category. Staff names are why `BusinessSummary.employeeNames` exists —
 * §12.22's "search finds a business by its owner's name" has to keep holding now that the
 * filtering moved off the server, and a client cannot query `profiles` to work them out.
 *
 * `area` is an exact match, not a substring: it comes from a `<select>` populated by
 * `listBusinessAreas()`, so its value is always a real city rather than something typed.
 */
export function filterBusinesses(
  businesses: BusinessSummary[],
  {
    query,
    area,
    categories,
    locale,
  }: { query: string; area: string; categories: Category[]; locale: Locale },
): BusinessSummary[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const normalizedArea = area.trim().toLocaleLowerCase();
  const categoryNameById = new Map(categories.map((category) => [category.id, category.name[locale]]));

  return businesses.filter((business) => {
    if (normalizedArea && business.area.trim().toLocaleLowerCase() !== normalizedArea) return false;
    if (!normalizedQuery) return true;

    return [
      business.name,
      business.area,
      business.address,
      business.description,
      categoryNameById.get(business.categoryId) ?? '',
      ...business.employeeNames,
    ]
      .join(' ')
      .toLocaleLowerCase()
      .includes(normalizedQuery);
  });
}
