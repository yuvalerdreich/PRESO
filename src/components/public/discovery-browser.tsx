'use client';

import { useMemo, useState } from 'react';
import { CalendarSearch } from 'lucide-react';

import { Building2 } from 'lucide-react';

import { ErrorDialog, ErrorNotice } from '@/components/common/error-dialog';
import { PanelHero } from '@/components/common/panel-hero';
import { BusinessResults } from '@/components/public/business-results';
import { SearchForm } from '@/components/public/search-form';
import { useBusinessSearch } from '@/hooks/use-business-search';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { BusinessSearchResult, Category, ViewerBusinessRelation } from '@/types/domain';

/**
 * The whole discovery screen: hero, search controls, category chips, business grid — and the
 * search state that ties them together.
 *
 * Searching **stays on this screen** (§12.43). Previously the entire business directory was
 * fetched once and filtered in the browser (`filterBusinesses()`); now `q`/`area`/category drive
 * real server-side pagination through `useBusinessSearch()` (`GET /api/businesses`), the same
 * "no navigation, filters in place" feel, but bounded to one page of results at a time instead of
 * shipping every business on every load. `/search?q=…` still works as a deep link — it seeds
 * `initialQuery`/`initialArea` and then behaves exactly like the home page.
 */
export function DiscoveryBrowser({
  categories,
  areas,
  initialResult,
  initialQuery = '',
  initialArea = '',
  blockedBusiness,
}: {
  categories: Category[];
  areas: string[];
  /** The server component's own first page, for the exact filters below — avoids a redundant client fetch on first paint. */
  initialResult: BusinessSearchResult;
  initialQuery?: string;
  initialArea?: string;
  /**
   * §12.55/§12.56 — a business you own, arrived at by typing its URL. Resolved independently of
   * the (now paginated) grid, so the "you can't book your own business" dialog doesn't depend on
   * that specific business having landed on the loaded page.
   */
  blockedBusiness?: { id: string; name: string; viewerRelation: ViewerBusinessRelation } | null;
}) {
  const { copy } = useLanguage();
  const [query, setQuery] = useState(initialQuery);
  const [area, setArea] = useState(initialArea);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [blockedDismissed, setBlockedDismissed] = useState(false);

  const categorySlug = useMemo(
    () => (selectedCategoryId ? categories.find((category) => category.id === selectedCategoryId)?.slug ?? null : null),
    [categories, selectedCategoryId],
  );

  const search = useBusinessSearch({ q: query, area, categorySlug }, initialResult);
  const businesses = useMemo(() => search.data?.pages.flatMap((page) => page.items) ?? [], [search.data]);
  const total = search.data?.pages.at(-1)?.total ?? 0;

  const searchApplied = query.trim().length > 0 || area.length > 0 || selectedCategoryId !== null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6">
      <PanelHero title={copy.discovery.title} description={copy.discovery.description} icon={CalendarSearch}>
        <SearchForm
          areas={areas}
          query={query}
          area={area}
          onQueryChange={setQuery}
          onAreaChange={setArea}
        />
      </PanelHero>

      {search.isError ? (
        <ErrorNotice description={copy.discovery.searchError} />
      ) : (
        <BusinessResults
          businesses={businesses}
          total={total}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
          searchApplied={searchApplied}
          hasMore={search.hasNextPage ?? false}
          isLoadingMore={search.isFetchingNextPage}
          onLoadMore={() => search.fetchNextPage()}
        />
      )}

      {blockedBusiness && !blockedDismissed ? (
        <ErrorDialog
          title={copy.businessProfile.ownBusiness.title}
          description={(blockedBusiness.viewerRelation === 'OWNER'
            ? copy.businessProfile.ownBusiness.descriptionOwner
            : copy.businessProfile.ownBusiness.descriptionStaff
          ).replace('{business}', blockedBusiness.name)}
          action={{
            href: '/businesses',
            label: copy.businessProfile.ownBusiness.goToMyBusinesses,
            icon: <Building2 className="h-4 w-4" aria-hidden="true" />,
          }}
          onClose={() => setBlockedDismissed(true)}
        />
      ) : null}
    </div>
  );
}
