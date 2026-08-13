import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PublicHeader } from '@/components/common/public-header';
import { LanguageProvider } from '@/lib/i18n/language-provider';

describe('public header', () => {
  it('renders the product hierarchy with working and disabled destinations', async () => {
    render(<LanguageProvider initialLocale="en"><PublicHeader /></LanguageProvider>);

    expect(screen.getAllByRole('link', { name: 'For businesses' })[0]).toHaveAttribute('href', '/onboarding');
    expect(screen.getByRole('link', { name: 'Customers Search and book' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Business owners & staff' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'My appointments' })).toHaveAttribute('href', '/me/appointments');
    expect(screen.getByText('Book an appointment')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTitle('System administration will be available later')).toHaveAttribute('aria-disabled', 'true');
  });
});
