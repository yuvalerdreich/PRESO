'use client';

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { readApiErrorMessage } from '@/lib/api-error';
import type { BusinessSearchResult } from '@/types/domain';

const PAGE_SIZE = 20;

export type BusinessSearchFilters = {
  q: string;
  area: string;
  /** A category **slug** — `GET /api/businesses` filters on it, never on the id (§5.2). */
  categorySlug: string | null;
};

/**
 * `GET /api/businesses`, paginated one page at a time (`PAGE_SIZE`).
 *
 * Replaces fetching the entire business directory into the browser and filtering it locally
 * (`filterBusinesses()`, now deleted) — that shape shipped every business's full record on every
 * page view regardless of how many actually matched, and handed a scraper the whole directory in
 * one request. `searchBusinessesPaged()` (the query behind this route) already existed and was
 * already tested; nothing here changes the server side, only which caller uses it.
 *
 * `initialResult` seeds the first page from the server component that rendered the surrounding
 * page (`(public)/page.tsx`/`search/page.tsx`), so the screen a visitor actually lands on never
 * needs a redundant client round trip for exactly what the server already computed. It is only
 * valid for the filters that produced it — callers must initialize their filter state to match.
 */
export function useBusinessSearch(filters: BusinessSearchFilters, initialResult?: BusinessSearchResult) {
  // `initialData` has no key-affinity of its own — it is applied to whatever query key is
  // *currently* active, not only the one it was actually fetched for. Passing it unconditionally
  // (a fresh `{ pages: [...] }` object every render, since `filters` changes) meant that once the
  // visitor typed anything, the new query key still got served `initialResult` as if it were
  // fresh data, `staleTime` treated it as not needing a refetch, and `queryFn` was never called —
  // the input updated but the grid silently never did. Capturing the filters at mount and gating
  // `initialData` on the current filters still matching them keeps the seed for the one key it is
  // actually valid for, and lets every other key fall through to a real fetch.
  const [initialFilters] = useState(filters);
  const isInitialFilters =
    filters.q === initialFilters.q &&
    filters.area === initialFilters.area &&
    filters.categorySlug === initialFilters.categorySlug;

  return useInfiniteQuery({
    queryKey: ['businesses', filters.q, filters.area, filters.categorySlug],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam), pageSize: String(PAGE_SIZE) });
      if (filters.q.trim()) params.set('q', filters.q.trim());
      if (filters.area) params.set('area', filters.area);
      if (filters.categorySlug) params.set('category', filters.categorySlug);

      const response = await fetch(`/api/businesses?${params.toString()}`);
      if (!response.ok) throw new Error((await readApiErrorMessage(response)) ?? 'Search failed');
      return (await response.json()) as BusinessSearchResult;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
    initialData: initialResult && isInitialFilters ? { pages: [initialResult], pageParams: [1] } : undefined,
    // Keep showing the previous filter's results while the new ones load, instead of a flash to
    // empty — the closest a real fetch can get to the old client-array-filter's instant feel.
    placeholderData: keepPreviousData,
  });
}
