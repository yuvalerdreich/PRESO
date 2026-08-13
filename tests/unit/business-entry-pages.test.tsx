import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import JoinRoute from '@/app/(business)/join/page';
import OnboardingRoute from '@/app/(business)/onboarding/page';
import { LanguageProvider } from '@/lib/i18n/language-provider';

describe('business-entry pages', () => {
  it('renders onboarding and join routes with shared localized UI', async () => {
    const { unmount } = render(<LanguageProvider initialLocale="en">{await OnboardingRoute()}</LanguageProvider>);
    expect(screen.getByRole('heading', { level: 1, name: 'Start your Preso journey' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /find an existing business/i })).toHaveAttribute('href', '/join');
    unmount();

    render(<LanguageProvider initialLocale="en">{await JoinRoute()}</LanguageProvider>);
    expect(screen.getByRole('heading', { level: 1, name: 'Request to join a business' })).toBeInTheDocument();
  });
});
