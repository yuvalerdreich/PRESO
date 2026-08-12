'use client';

import { CalendarDays } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';

export function PresoLogo() {
  const { copy } = useLanguage();

  return (
    <div className="flex items-center gap-3 text-start">
      <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#6f5cff,#3f2bd8)] text-white shadow-[0_12px_24px_rgba(82,56,247,.27)]">
        <CalendarDays aria-hidden="true" size={21} strokeWidth={2.4} />
      </span>
      <div className="hidden sm:block">
        <div className="flex items-center gap-2 text-lg font-black leading-none tracking-tight">
          <span className="text-[var(--brand-dark)]">{copy.brand.name}</span>
          <span className="rounded-full border border-violet-100 bg-violet-50 px-2 py-1 text-[10px] font-bold tracking-wide text-violet-600">
            {copy.brand.version}
          </span>
        </div>
        <p className="mt-1 max-w-72 text-[11px] leading-4 text-[var(--muted)]">{copy.header.tagline}</p>
      </div>
    </div>
  );
}
