'use client';

import Link from 'next/link';
import { Search, UsersRound } from 'lucide-react';

import { LanguageSwitcher } from '@/components/common/language-switcher';
import { PresoLogo } from '@/components/common/preso-logo';
import { useLanguage } from '@/lib/i18n/language-provider';

export function PublicHeader() {
  const { copy } = useLanguage();

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[4.75rem] w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <PresoLogo />
        <nav className="hidden items-center rounded-2xl border border-[#e8e8f2] bg-[#f7f7fb] p-1 md:flex" aria-label={copy.header.discovery}>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-[var(--brand)] shadow-[0_3px_10px_rgba(37,34,99,.08)] transition hover:text-[var(--brand-deep)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
          >
            <UsersRound aria-hidden="true" size={16} />
            {copy.header.discovery}
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:bg-white hover:text-[var(--brand)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
          >
            <Search aria-hidden="true" size={16} />
            {copy.header.browse}
          </Link>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/search"
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-semibold text-[var(--brand)] shadow-sm"
          >
            <Search aria-hidden="true" size={16} />
            <span className="sr-only">{copy.header.browse}</span>
          </Link>
        </div>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
