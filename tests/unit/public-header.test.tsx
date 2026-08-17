import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { ProfileSettingsProvider } from '@/components/common/profile-settings-provider';
import { PublicHeader } from '@/components/common/public-header';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import { translations } from '@/lib/i18n/translations';

function renderHeader(currentUser?: { fullName: string } | null) {
  return render(
    <LanguageProvider initialLocale="en">
      <ProfileSettingsProvider initialLocation="" initialDateOfBirth="" accountType="CLIENT">
        <PublicHeader currentUser={currentUser} />
      </ProfileSettingsProvider>
    </LanguageProvider>,
  );
}

describe('public header', () => {
  it('renders the brand mark', () => {
    renderHeader();

    expect(screen.getByText(translations.en.brand.name)).toBeInTheDocument();
    expect(screen.getByText(translations.en.header.subtitle)).toBeInTheDocument();
  });

  it('no longer carries the My Appointments control — it lives in the sidebar now', () => {
    renderHeader();

    expect(screen.queryByText(translations.en.sidebar.appointments)).not.toBeInTheDocument();
  });

  it('shows a sign-in link when no one is logged in', () => {
    renderHeader();

    expect(screen.getByRole('link', { name: translations.en.header.signIn })).toHaveAttribute('href', '/login');
    expect(screen.queryByText(translations.en.header.logout)).not.toBeInTheDocument();
  });

  it('shows a greeting and a logout button instead of sign-in when a user is logged in', () => {
    renderHeader({ fullName: 'Noa Golan' });

    expect(screen.getByText(`${translations.en.header.greeting} Noa Golan`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: translations.en.header.logout })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: translations.en.header.signIn })).not.toBeInTheDocument();
  });

  it('opens the profile settings modal when the greeting is clicked', () => {
    renderHeader({ fullName: 'Noa Golan' });

    expect(screen.queryByRole('heading', { name: translations.en.profileSettings.title })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(`${translations.en.header.greeting} Noa Golan`));
    expect(screen.getByRole('heading', { name: translations.en.profileSettings.title })).toBeInTheDocument();
  });
});
