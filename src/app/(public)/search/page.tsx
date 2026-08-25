import { DiscoveryBrowser } from '@/components/public/discovery-browser';
import { listBusinessAreas, listCategories, searchBusinessesPaged } from '@/server/queries/discovery';

const SEARCH_PAGE_SIZE = 20;

/**
 * `/search` (TECHNICAL_DESIGN.md §5.2) — a deep-link entry point, not a separate results screen.
 *
 * Searching from the home page no longer navigates here (§12.43): it filters in place. This route
 * stays so an existing `/search?q=…&area=…` link still opens something sensible — it renders the
 * same `DiscoveryBrowser`, seeded from the URL and from the matching first page of
 * `searchBusinessesPaged()`, and behaves identically from there on, including clearing the box to
 * see every business again.
 */
export default async function SearchPage({ searchParams }: PageProps<'/search'>) {
  const params = await searchParams;
  const readParam = (value: string | string[] | undefined) => (typeof value === 'string' ? value.trim() : '');

  const q = readParam(params.q);
  const area = readParam(params.area);

  const [categories, areas, result] = await Promise.all([
    listCategories(),
    listBusinessAreas(),
    searchBusinessesPaged({
      page: 1,
      pageSize: SEARCH_PAGE_SIZE,
      sort: 'relevance',
      q: q || undefined,
      area: area || undefined,
    }),
  ]);

  return (
    <DiscoveryBrowser
      categories={categories}
      areas={areas}
      initialResult={result}
      initialQuery={q}
      initialArea={area}
    />
  );
}
