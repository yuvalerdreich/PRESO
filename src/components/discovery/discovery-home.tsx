'use client';

import { BusinessResults } from '@/components/discovery/business-results';
import { CategoryChips } from '@/components/discovery/category-chips';
import { SearchForm } from '@/components/discovery/search-form';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { DiscoveryArea, DiscoveryBusiness, DiscoveryCategory } from '@/types/domain';

type DiscoveryHomeProps = {
  categories: DiscoveryCategory[];
  areas: DiscoveryArea[];
  businesses: DiscoveryBusiness[];
};

export function DiscoveryHome({ categories, areas, businesses }: DiscoveryHomeProps) {
  const { copy } = useLanguage();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-9 sm:px-6 sm:py-10">
      <section className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_15%_15%,#3d2c94_0,transparent_34%),linear-gradient(115deg,#1a2150_0%,#111b38_52%,#49119b_100%)] px-5 py-12 text-white shadow-2xl shadow-indigo-200 sm:px-10 sm:py-16 lg:px-20">
        <div className="mx-auto max-w-5xl text-center">
          <p className="inline-flex rounded-full border border-violet-300/40 bg-violet-300/10 px-4 py-2 text-sm font-semibold text-violet-100">
            {copy.discovery.eyebrow}
          </p>
          <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {copy.discovery.title}
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-indigo-100 sm:text-lg">
            {copy.discovery.description}
          </p>
          <div className="mt-8">
            <SearchForm categories={categories} areas={areas} />
          </div>
        </div>
      </section>

      <div className="mt-7">
        <CategoryChips categories={categories} />
      </div>

      <section className="mt-11" aria-labelledby="featured-businesses-heading">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="featured-businesses-heading" className="text-2xl font-black tracking-tight sm:text-3xl">
            {copy.discovery.featuredTitle}
          </h2>
          <p className="text-sm text-[var(--muted)]">{copy.discovery.mockNotice}</p>
        </div>
        <BusinessResults businesses={businesses} />
      </section>
    </main>
  );
}
