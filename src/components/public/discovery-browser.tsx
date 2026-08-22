'use client';

import { useMemo, useState } from 'react';
import { CalendarSearch } from 'lucide-react';

import { Building2 } from 'lucide-react';

import { ErrorDialog } from '@/components/common/error-dialog';
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
  blockedBusinessId,
}: {
  businesses: BusinessSummary[];
  categories: Category[];
  areas: string[];
  initialQuery?: string;
  initialArea?: string;
  /**
   * §12.55/§12.56 — a business you own, arrived at by typing its URL. The booking route sends you
   * here rather than rendering a page of its own, and the refusal opens over the grid.
   */
  blockedBusinessId?: string;
}) {
  const { copy } = useLanguage();
  const [query, setQuery] = useState(initialQuery);
  const [area, setArea] = useState(initialArea);
  const [blockedDismissed, setBlockedDismissed] = useState(false);

  const blockedBusiness = blockedBusinessId
    ? businesses.find((business) => business.id === blockedBusinessId && business.viewerRelation)
    : undefined;

  const filtered = useMemo(
    () => filterBusinesses(businesses, { query, area, categories }),
    [businesses, query, area, categories],
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

      {blockedBusiness?.viewerRelation && !blockedDismissed ? (
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
