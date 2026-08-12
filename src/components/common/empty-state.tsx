'use client';

import Link from 'next/link';
import { SearchX } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';

export function EmptyState() {
  const { copy } = useLanguage();

  return (
    <section className="rounded-3xl border border-dashed border-[var(--line)] bg-white px-6 py-14 text-center">
      <SearchX aria-hidden="true" size={28} className="mx-auto text-[var(--brand)]" />
      <h2 className="mt-4 text-xl font-bold">{copy.emptyState.title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
        {copy.emptyState.description}
      </p>
      <Link
        href="/search"
        className="mt-6 inline-flex rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700"
      >
        {copy.emptyState.clearFilters}
      </Link>
    </section>
  );
}
