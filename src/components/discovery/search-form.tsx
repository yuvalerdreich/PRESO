'use client';

import { Search } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { DiscoveryArea, DiscoveryCategory } from '@/types/domain';

type SearchFormProps = {
  categories: DiscoveryCategory[];
  areas: DiscoveryArea[];
  initialValues?: { q?: string; category?: string; area?: string };
};

export function SearchForm({ categories, areas, initialValues }: SearchFormProps) {
  const { locale, copy } = useLanguage();

  return (
    <form action="/search" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
      <label className="sr-only" htmlFor="business-query">
        {copy.discovery.searchPlaceholder}
      </label>
      <input
        id="business-query"
        name="q"
        type="search"
        defaultValue={initialValues?.q}
        placeholder={copy.discovery.searchPlaceholder}
        className="min-h-14 rounded-2xl border border-white/15 bg-white/[.12] px-5 text-sm text-white shadow-inner shadow-black/5 outline-none transition placeholder:text-white/55 hover:bg-white/[.16] focus:border-white/70 focus:bg-white/[.18] focus:ring-4 focus:ring-white/10"
      />
      <label className="sr-only" htmlFor="business-category">
        {copy.discovery.categoryPlaceholder}
      </label>
      <select
        id="business-category"
        name="category"
        defaultValue={initialValues?.category ?? ''}
        className="min-h-14 rounded-2xl border border-white/15 bg-white/[.12] px-4 text-sm text-white shadow-inner shadow-black/5 outline-none transition hover:bg-white/[.16] focus:border-white/70 focus:bg-white/[.18] focus:ring-4 focus:ring-white/10"
      >
        <option value="" className="text-[var(--foreground)]">{copy.discovery.categoryPlaceholder}</option>
        {categories.map((category) => (
          <option key={category.id} value={category.slug} className="text-[var(--foreground)]">
            {category.name[locale]}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="business-area">
        {copy.discovery.areaPlaceholder}
      </label>
      <select
        id="business-area"
        name="area"
        defaultValue={initialValues?.area ?? ''}
        className="min-h-14 rounded-2xl border border-white/15 bg-white/[.12] px-4 text-sm text-white shadow-inner shadow-black/5 outline-none transition hover:bg-white/[.16] focus:border-white/70 focus:bg-white/[.18] focus:ring-4 focus:ring-white/10"
      >
        <option value="" className="text-[var(--foreground)]">{copy.discovery.areaPlaceholder}</option>
        {areas.map((area) => (
          <option key={area.id} value={area.id} className="text-[var(--foreground)]">
            {area.name[locale]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-white px-6 text-sm font-black text-[var(--brand-deep)] shadow-[0_12px_24px_rgba(9,12,41,.2)] transition duration-200 hover:-translate-y-0.5 hover:bg-violet-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Search aria-hidden="true" size={18} />
        {copy.discovery.searchButton}
      </button>
    </form>
  );
}
