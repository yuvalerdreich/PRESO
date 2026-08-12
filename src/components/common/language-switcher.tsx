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
      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3 text-sm font-medium text-[var(--foreground)] transition hover:border-violet-300 hover:text-[var(--brand)]"
      aria-label={copy.header.switchToEnglish}
    >
      <Globe2 aria-hidden="true" size={17} />
      <span>{copy.header.switchToEnglish}</span>
    </button>
  );
}
