import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MyBusinessesPage } from '@/components/business/my-businesses-page';
import { LanguageProvider } from '@/lib/i18n/language-provider';

describe('my businesses page', () => {
  it('shows the business actions, filters, and empty state', () => {
    render(
      <LanguageProvider initialLocale="en">
        <MyBusinessesPage />
      </LanguageProvider>,
    );

    expect(screen.getByRole('heading', { name: 'My businesses' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open a new business' })).toHaveAttribute('href', '/onboarding');
    expect(screen.getByRole('link', { name: 'Join an existing business' })).toHaveAttribute('href', '/join');
    expect(screen.getByRole('heading', { name: 'No businesses linked yet' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /active staff/i }));
    expect(screen.getByRole('tab', { name: /active staff/i })).toHaveAttribute('aria-selected', 'true');
  });
});
