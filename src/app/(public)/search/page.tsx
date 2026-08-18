import { DiscoveryBrowser } from '@/components/public/discovery-browser';
import { listBusinessAreas, listCategories, searchBusinesses } from '@/server/queries/discovery';

/**
 * `/search` (TECHNICAL_DESIGN.md §5.2) — a deep-link entry point, not a separate results screen.
 *
 * Searching from the home page no longer navigates here (§12.43): it filters in place. This route
 * stays so an existing `/search?q=…&area=…` link still opens something sensible — it renders the
 * same `DiscoveryBrowser`, seeded from the URL, and behaves identically from there on, including
 * clearing the box to see every business again.
 */
export default async function SearchPage({ searchParams }: PageProps<'/search'>) {
  const params = await searchParams;
  const readParam = (value: string | string[] | undefined) => (typeof value === 'string' ? value.trim() : '');

  const [categories, areas, businesses] = await Promise.all([
    listCategories(),
    listBusinessAreas(),
    searchBusinesses(),
  ]);

  return (
    <DiscoveryBrowser
      businesses={businesses}
      categories={categories}
      areas={areas}
      initialQuery={readParam(params.q)}
      initialArea={readParam(params.area)}
    />
  );
}
