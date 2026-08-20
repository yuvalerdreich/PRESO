import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pathname = vi.hoisted(() => ({ current: '/' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

import { AccountSidebar } from '@/components/common/account-sidebar';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import { translations } from '@/lib/i18n/translations';
import type { ClientAppointment } from '@/types/domain';
import type { Database } from '@/types/database.types';

function appointment(overrides: Partial<ClientAppointment>): ClientAppointment {
  return {
    id: 'a',
    businessName: 'Studio Zohar - ׳׳¡׳₪׳¨׳× ׳–׳•׳”׳¨',
    employeeName: '׳–׳•׳”׳¨ ׳׳•׳™',
    serviceName: '׳×׳¡׳₪׳•׳¨׳×',
    address: '׳¨׳—׳•׳‘ ׳“׳™׳–׳ ׳’׳•׳£ 142, ׳×׳ ׳׳‘׳™׳‘',
    dateISO: '2999-01-01',
    time: '10:00',
    status: 'CONFIRMED',
    ...overrides,
  };
}

function renderSidebar(
  appointments: ClientAppointment[],
  accountType?: Database['public']['Enums']['account_type'],
) {
  return render(
    <LanguageProvider initialLocale="en">
      <AccountSidebar appointments={appointments} accountType={accountType} />
    </LanguageProvider>,
  );
}

describe('account sidebar', () => {
  beforeEach(() => {
    pathname.current = '/';
  });

  it('shows a client exactly two entries ג€” home and my appointments', () => {
    renderSidebar([]);

    const nav = screen.getByRole('navigation', { name: translations.en.sidebar.title });
    expect(screen.getByText(translations.en.sidebar.title)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: translations.en.sidebar.home })).toHaveAttribute('href', '/');
    expect(screen.getByText(translations.en.sidebar.appointments)).toBeInTheDocument();
    expect(nav.querySelectorAll('a, button')).toHaveLength(2);
    expect(
      screen.queryByRole('link', { name: translations.en.sidebar.businessDashboard }),
    ).not.toBeInTheDocument();
  });

  it('marks the current route as the active entry', () => {
    renderSidebar([]);

    expect(screen.getByRole('link', { name: translations.en.sidebar.home })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('links the my-appointments entry to the full appointments page', () => {
    renderSidebar([appointment({ id: 'upcoming-1' })]);

    expect(
      screen.getByRole('link', { name: translations.en.sidebar.openAppointments }),
    ).toHaveAttribute('href', '/me/appointments');
  });

  it('badges only future, non-cancelled appointments and hides the badge at zero', () => {
    const { unmount } = renderSidebar([
      appointment({ id: 'upcoming', dateISO: '2999-01-01', status: 'CONFIRMED' }),
      appointment({ id: 'upcoming-cancelled', dateISO: '2999-01-01', status: 'CANCELLED' }),
      appointment({ id: 'past', dateISO: '2000-01-01', status: 'CONFIRMED' }),
    ]);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
    unmount();

    renderSidebar([]);
    expect(
      screen.getByRole('link', { name: translations.en.sidebar.openAppointments }),
    ).not.toHaveTextContent('0');
  });

  it('adds the My Businesses entry for a business account', () => {
    renderSidebar([], 'BUSINESS');

    expect(screen.getByRole('link', { name: translations.en.sidebar.myBusinesses })).toHaveAttribute(
      'href',
      '/businesses',
    );
    expect(screen.queryByRole('link', { name: translations.en.sidebar.businessDashboard })).not.toBeInTheDocument();
  });

  it('keeps My Businesses lit while inside business management', () => {
    // Managing a business happens under `/businesses/manage/**`, which is still that section of the
    // site — the entry going dark there made the portal look like somewhere else entirely.
    pathname.current = '/businesses/manage/hours';
    renderSidebar([], 'BUSINESS');

    expect(screen.getByRole('link', { name: translations.en.sidebar.myBusinesses })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: translations.en.sidebar.home })).not.toHaveAttribute(
      'aria-current',
    );
  });
});
