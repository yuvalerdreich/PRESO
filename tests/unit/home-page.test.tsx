import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * The page is a Server Component that now reads through `server/queries/*`, which opens a
 * cookie-bound Supabase client — impossible in jsdom, where there is no request store. Stubbing
 * the query module keeps this a test of *page composition*, which is what it always was: the
 * mock repository it previously depended on was doing exactly this job, just less visibly.
 * The queries themselves are covered against the real database in `tests/int/queries-public`.
 */
vi.mock('@/server/queries/discovery', () => ({
  listCategories: async () => [],
  listBusinessAreas: async () => [],
  searchBusinesses: async () => [],
}));

import HomePage from '@/app/(public)/page';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import { translations } from '@/lib/i18n/translations';

/**
 * Proves the component runner works: jsdom, the React plugin, RTL queries and
 * jest-dom matchers. Component behaviour tests start with the booking wizard.
 */
describe('component test harness', () => {
  it('renders the landing page heading', async () => {
    render(
      <LanguageProvider initialLocale="en">
        {await HomePage({ searchParams: Promise.resolve({}), params: Promise.resolve({}) })}
      </LanguageProvider>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: translations.en.discovery.title }),
    ).toBeInTheDocument();
  });
});
