'use client';

import Link from 'next/link';
import { CalendarDays } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';

export function PresoLogo() {
  const { copy } = useLanguage();

  return (
    <Link href="/" className="flex items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand)] text-white">
        <CalendarDays className="h-5 w-5" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-lg font-bold leading-tight text-[var(--brand)]">
          {copy.brand.name}
        </span>
        <span className="block text-xs leading-tight text-[var(--muted)]">{copy.header.subtitle}</span>
      </span>
    </Link>
  );
}
