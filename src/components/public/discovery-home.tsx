'use client';

import { SearchForm } from '@/components/public/search-form';
import { useLanguage } from '@/lib/i18n/language-provider';

export function DiscoveryHome() {
  const { copy } = useLanguage();

  return (
    <section className="rounded-3xl bg-gradient-to-br from-[var(--brand-dark)] via-[var(--brand-deep)] to-[var(--brand)] px-6 py-12 sm:px-12 sm:py-16">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <h1 className="text-2xl font-bold text-white sm:text-4xl">{copy.discovery.title}</h1>
        <p className="text-sm text-white/80 sm:text-base">{copy.discovery.description}</p>
        <div className="w-full">
          <SearchForm />
        </div>
      </div>
    </section>
  );
}
