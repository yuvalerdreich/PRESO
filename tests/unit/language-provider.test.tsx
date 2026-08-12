import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LanguageProvider, useLanguage } from '@/lib/i18n/language-provider';

function LanguageProbe() {
  const { copy, direction, locale, setLocale } = useLanguage();

  return (
    <>
      <p>{copy.brand.name}</p>
      <p>{direction}</p>
      <button type="button" onClick={() => setLocale(locale === 'he' ? 'en' : 'he')}>
        {copy.header.switchToEnglish}
      </button>
    </>
  );
}

describe('language provider', () => {
  afterEach(() => {
    localStorage.clear();
    document.cookie = 'preso_locale=; path=/; max-age=0';
  });

  it('switches copy, direction, and persisted locale immediately', () => {
    render(
      <LanguageProvider initialLocale="he">
        <LanguageProbe />
      </LanguageProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Switch to English' }));

    expect(screen.getByText('Preso')).toBeInTheDocument();
    expect(screen.getByText('ltr')).toBeInTheDocument();
    expect(document.documentElement.dir).toBe('ltr');
    expect(document.documentElement.lang).toBe('en');
    expect(localStorage.getItem('preso.locale')).toBe('en');
  });
});
