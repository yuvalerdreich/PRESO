import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
        {await HomePage()}
      </LanguageProvider>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: translations.en.discovery.title }),
    ).toBeInTheDocument();
  });
});
