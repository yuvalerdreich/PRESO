import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));

vi.mock('next/navigation', () => ({ usePathname }));

import { AccountSidebar } from '@/components/common/account-sidebar';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import { translations } from '@/lib/i18n/translations';

function renderSidebar(accountType: 'CLIENT' | 'BUSINESS') {
  return render(
    <LanguageProvider initialLocale="en">
      <AccountSidebar accountType={accountType} />
    </LanguageProvider>,
  );
}

describe('AccountSidebar', () => {
  beforeEach(() => {
    usePathname.mockReturnValue('/me/appointments');
  });

  it('shows Home and My appointments for a client account', () => {
    renderSidebar('CLIENT');

    expect(screen.getByRole('link', { name: translations.en.accountSidebar.home })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: translations.en.accountSidebar.appointments })).toHaveAttribute(
      'href',
      '/me/appointments',
    );
    expect(screen.queryByRole('link', { name: translations.en.accountSidebar.businesses })).not.toBeInTheDocument();
  });

  it('shows Home, My appointments, and My businesses for a business account', () => {
    renderSidebar('BUSINESS');

    expect(screen.getByRole('link', { name: translations.en.accountSidebar.home })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: translations.en.accountSidebar.appointments })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: translations.en.accountSidebar.businesses })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });

  it('marks the current page as active', () => {
    renderSidebar('CLIENT');

    expect(screen.getByRole('link', { name: translations.en.accountSidebar.appointments })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
