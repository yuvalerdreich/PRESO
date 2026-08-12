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
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-6 sm:py-10 lg:py-12">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_12%_14%,rgba(126,99,255,.45)_0,transparent_28%),radial-gradient(circle_at_90%_90%,rgba(183,85,255,.27)_0,transparent_30%),linear-gradient(118deg,#151c47_0%,#111933_50%,#38206f_100%)] px-5 py-12 text-white shadow-[0_24px_50px_rgba(33,37,93,.2)] sm:rounded-[2.5rem] sm:px-10 sm:py-16 lg:px-18 lg:py-20">
        <div className="pointer-events-none absolute -top-28 -end-26 size-80 rounded-full border border-violet-200/15" />
        <div className="pointer-events-none absolute -bottom-44 -start-30 size-96 rounded-full bg-violet-500/12 blur-3xl" />
        <div className="relative mx-auto max-w-5xl text-center">
          <p className="inline-flex rounded-full border border-violet-200/30 bg-white/[.07] px-4 py-2 text-sm font-bold text-violet-100 shadow-sm backdrop-blur-sm">
            {copy.discovery.eyebrow}
          </p>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-[1.14] tracking-tight text-balance sm:text-5xl lg:text-6xl xl:text-7xl">
            {copy.discovery.title}
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-indigo-100/90 sm:text-lg sm:leading-8">
            {copy.discovery.description}
          </p>
          <div className="mt-9 rounded-[1.7rem] border border-white/10 bg-black/10 p-3 shadow-[0_18px_35px_rgba(7,11,35,.22)] backdrop-blur-md sm:p-4">
            <SearchForm categories={categories} areas={areas} />
          </div>
        </div>
      </section>

      <div className="mt-8 sm:mt-10">
        <CategoryChips categories={categories} />
      </div>

      <section className="mt-13 sm:mt-15" aria-labelledby="featured-businesses-heading">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-sm font-bold text-[var(--brand)]">{copy.discovery.categoriesTitle}</span>
            <h2 id="featured-businesses-heading" className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            {copy.discovery.featuredTitle}
            </h2>
          </div>
          <p className="rounded-full bg-[var(--soft-violet)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)]">{copy.discovery.mockNotice}</p>
        </div>
        <BusinessResults businesses={businesses} />
      </section>
    </main>
  );
}
