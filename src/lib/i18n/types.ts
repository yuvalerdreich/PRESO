export const locales = ['he', 'en'] as const;

export type Locale = (typeof locales)[number];
export type Direction = 'rtl' | 'ltr';

export const localeDetails: Record<Locale, { direction: Direction; htmlLang: string }> = {
  he: { direction: 'rtl', htmlLang: 'he' },
  en: { direction: 'ltr', htmlLang: 'en' },
};

export function isLocale(value: string | undefined): value is Locale {
  return value === 'he' || value === 'en';
}
