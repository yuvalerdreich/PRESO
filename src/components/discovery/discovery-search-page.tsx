'use client';

import { BusinessResults } from '@/components/discovery/business-results';
import { SearchForm } from '@/components/discovery/search-form';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { DiscoveryFilters } from '@/lib/discovery/repository';
import type { DiscoveryArea, DiscoveryBusiness, DiscoveryCategory } from '@/types/domain';

type DiscoverySearchPageProps = {
  categories: DiscoveryCategory[];
  areas: DiscoveryArea[];
  businesses: DiscoveryBusiness[];
  filters: DiscoveryFilters;
};

export function DiscoverySearchPage({
  categories,
  areas,
  businesses,
  filters,
}: DiscoverySearchPageProps) {
  const { copy } = useLanguage();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-9 sm:px-6 sm:py-10">
      <section className="rounded-[2rem] bg-[linear-gradient(120deg,#18214b,#44208e)] px-5 py-8 text-white shadow-xl shadow-indigo-200 sm:px-8">
        <p className="text-sm font-semibold text-violet-200">{copy.header.browse}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{copy.discovery.featuredTitle}</h1>
        <div className="mt-6">
          <SearchForm categories={categories} areas={areas} initialValues={filters} />
        </div>
      </section>

      <section className="mt-10" aria-labelledby="search-results-heading">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="search-results-heading" className="text-2xl font-black tracking-tight sm:text-3xl">
            {businesses.length} {copy.discovery.resultCount}
          </h2>
          {(filters.q || filters.category || filters.area) && (
            <p className="text-sm text-[var(--muted)]">{copy.discovery.filteredResultHint}</p>
          )}
        </div>
        <BusinessResults businesses={businesses} />
      </section>
    </main>
  );
}
