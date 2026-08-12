'use client';

import Link from 'next/link';
import { Search, UsersRound } from 'lucide-react';

import { LanguageSwitcher } from '@/components/common/language-switcher';
import { TorimLogo } from '@/components/common/torim-logo';
import { useLanguage } from '@/lib/i18n/language-provider';

export function PublicHeader() {
  const { copy } = useLanguage();

  return (
    <header className="border-b border-[var(--line)] bg-white/95">
      <div className="mx-auto flex min-h-17 w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <TorimLogo />
        <nav className="hidden items-center rounded-xl bg-[#f1f4f9] p-1 md:flex" aria-label={copy.header.discovery}>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[var(--brand)] shadow-sm"
          >
            <UsersRound aria-hidden="true" size={16} />
            {copy.header.discovery}
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:text-[var(--brand)]"
          >
            <Search aria-hidden="true" size={16} />
            {copy.header.browse}
          </Link>
        </nav>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
