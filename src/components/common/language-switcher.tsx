'use client';

import { Globe2 } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';

export function LanguageSwitcher() {
  const { locale, copy, setLocale } = useLanguage();
  const nextLocale = locale === 'he' ? 'en' : 'he';

  return (
    <button
      type="button"
      onClick={() => setLocale(nextLocale)}
      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:text-[var(--brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
      aria-label={copy.header.switchToEnglish}
    >
      <Globe2 aria-hidden="true" size={17} />
      <span>{copy.header.switchToEnglish}</span>
    </button>
  );
}
