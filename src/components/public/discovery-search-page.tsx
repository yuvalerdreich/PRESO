'use client';

import { BusinessResults } from '@/components/public/business-results';
import { SearchForm } from '@/components/public/search-form';
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
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-6 sm:py-10 lg:py-12">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_92%_0%,rgba(137,109,255,.32),transparent_33%),linear-gradient(118deg,#171e48,#35206c)] px-5 py-8 text-white shadow-[0_20px_40px_rgba(36,32,99,.16)] sm:px-8 sm:py-10">
        <div className="pointer-events-none absolute -bottom-25 -start-18 size-56 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative">
          <p className="text-sm font-bold text-violet-200">{copy.header.browse}</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{copy.discovery.featuredTitle}</h1>
        <div className="mt-7 rounded-[1.5rem] border border-white/10 bg-black/10 p-3 backdrop-blur-md sm:p-4">
          <SearchForm categories={categories} areas={areas} initialValues={filters} />
        </div>
        </div>
      </section>

      <section className="mt-11" aria-labelledby="search-results-heading">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <h2 id="search-results-heading" className="text-2xl font-black tracking-tight sm:text-3xl">
            {businesses.length} {copy.discovery.resultCount}
          </h2>
          {(filters.q || filters.category || filters.area) && (
            <p className="rounded-full bg-[var(--soft-violet)] px-3 py-1.5 text-xs font-bold text-[var(--brand)]">{copy.discovery.filteredResultHint}</p>
          )}
        </div>
        <BusinessResults businesses={businesses} />
      </section>
    </main>
  );
}
