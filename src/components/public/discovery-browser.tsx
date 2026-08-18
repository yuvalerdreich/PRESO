'use client';

import { useMemo, useState } from 'react';
import { CalendarSearch } from 'lucide-react';

import { PanelHero } from '@/components/common/panel-hero';
import { BusinessResults } from '@/components/public/business-results';
import { SearchForm } from '@/components/public/search-form';
import { filterBusinesses } from '@/lib/discovery/filter-businesses';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { BusinessSummary, Category } from '@/types/domain';

/**
 * The whole discovery screen: hero, search controls, category chips, business grid — and the
 * search state that ties them together.
 *
 * Searching **stays on this screen** (§12.43). The grid is already fetched, so typing filters it in
 * place through `filterBusinesses()`; there is no navigation, no second results page, and no
 * round-trip per keystroke. `/search?q=…` still works as a deep link — it seeds `initialQuery` /
 * `initialArea` and then behaves exactly like the home page, including clearing back to everything.
 */
export function DiscoveryBrowser({
  businesses,
  categories,
  areas,
  initialQuery = '',
  initialArea = '',
}: {
  businesses: BusinessSummary[];
  categories: Category[];
  areas: string[];
  initialQuery?: string;
  initialArea?: string;
}) {
  const { copy, locale } = useLanguage();
  const [query, setQuery] = useState(initialQuery);
  const [area, setArea] = useState(initialArea);

  const filtered = useMemo(
    () => filterBusinesses(businesses, { query, area, categories, locale }),
    [businesses, query, area, categories, locale],
  );

  const searchApplied = query.trim().length > 0 || area.length > 0;

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

      <BusinessResults businesses={filtered} categories={categories} searchApplied={searchApplied} />
    </div>
  );
}
