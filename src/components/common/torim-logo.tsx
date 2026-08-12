'use client';

import { CalendarDays } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';

export function TorimLogo() {
  const { copy } = useLanguage();

  return (
    <div className="flex items-center gap-3">
      <span className="inline-flex size-11 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#6349ff,#3e2ae6)] text-white shadow-lg shadow-violet-300/60">
        <CalendarDays aria-hidden="true" size={22} />
      </span>
      <div className="hidden text-start sm:block">
        <div className="flex items-center gap-2 font-bold leading-none tracking-tight">
          <span>{copy.brand.name}</span>
          <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-medium tracking-wide text-violet-600">
            {copy.brand.version}
          </span>
        </div>
        <p className="mt-1 max-w-72 text-xs leading-4 text-[var(--muted)]">{copy.header.tagline}</p>
      </div>
    </div>
  );
}
