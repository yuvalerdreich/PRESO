'use client';

import Link from 'next/link';
import { SearchX } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';

export function EmptyState() {
  const { copy } = useLanguage();

  return (
    <section className="rounded-[2rem] border border-[var(--line)] bg-[linear-gradient(135deg,#fff,#f5f2ff)] px-6 py-16 text-center shadow-[0_10px_30px_rgba(43,38,105,.06)]">
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-white text-[var(--brand)] shadow-[0_10px_20px_rgba(82,56,247,.14)]">
        <SearchX aria-hidden="true" size={26} />
      </span>
      <h2 className="mt-5 text-xl font-black">{copy.emptyState.title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
        {copy.emptyState.description}
      </p>
      <Link
        href="/search"
        className="mt-6 inline-flex rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(82,56,247,.24)] transition hover:-translate-y-0.5 hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
      >
        {copy.emptyState.clearFilters}
      </Link>
    </section>
  );
}
