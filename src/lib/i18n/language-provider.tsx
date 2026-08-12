'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { localeDetails, isLocale, type Direction, type Locale } from '@/lib/i18n/types';
import { translations, type Translation } from '@/lib/i18n/translations';

const LOCALE_STORAGE_KEY = 'torim.locale';
export const LOCALE_COOKIE_KEY = 'torim_locale';

type LanguageContextValue = {
  locale: Locale;
  direction: Direction;
  copy: Translation;
  setLocale: (locale: Locale) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function applyDocumentLocale(locale: Locale) {
  const { direction, htmlLang } = localeDetails[locale];
  document.documentElement.lang = htmlLang;
  document.documentElement.dir = direction;
}

function persistLocale(locale: Locale) {
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  document.cookie = `${LOCALE_COOKIE_KEY}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  const [locale, setLocaleState] = useState(initialLocale);

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  useEffect(() => {
    const savedLocale = localStorage.getItem(LOCALE_STORAGE_KEY) ?? undefined;
    const nextLocale = isLocale(savedLocale) ? savedLocale : initialLocale;

    if (nextLocale === initialLocale) return;

    // Normally the cookie makes the initial server render match localStorage.
    // This covers an older localStorage-only preference: direction changes
    // before the next paint, then React swaps the translated copy.
    applyDocumentLocale(nextLocale);
    const frame = requestAnimationFrame(() => setLocaleState(nextLocale));
    return () => cancelAnimationFrame(frame);
  }, [initialLocale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    applyDocumentLocale(nextLocale);
    persistLocale(nextLocale);
    setLocaleState(nextLocale);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      direction: localeDetails[locale].direction,
      copy: translations[locale],
      setLocale,
    }),
    [locale, setLocale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider.');
  return context;
}
