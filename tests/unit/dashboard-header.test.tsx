import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const pathname = vi.hoisted(() => ({ current: '/dashboard' }));

vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
}));

import { DashboardHeader } from '@/components/business/dashboard-header';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import type { DashboardBusiness, DashboardNavCounts } from '@/types/domain';

const business: DashboardBusiness = {
  id: 'business-zohar',
  name: 'Studio Zohar',
  categoryName: 'Hair and beauty',
  address: '142 Dizengoff Street',
  area: 'Tel Aviv',
  phone: '054-1112233',
  photoUrl: '',
  timezone: 'Asia/Jerusalem',
  approvalPolicy: 'AUTO',
  cancellationWindowHours: 24,
  status: 'ACTIVE',
  isOwner: true,
};

const counts: DashboardNavCounts = {
  appointmentsToday: 0,
  activeStaff: 1,
  activeServices: 2,
  openWaitlist: 0,
};

function renderHeader(overrides: Partial<DashboardBusiness> = {}) {
  return render(
    <LanguageProvider initialLocale="en">
      <DashboardHeader business={{ ...business, ...overrides }} counts={counts} />
    </LanguageProvider>,
  );
}

describe('business dashboard header', () => {
  it('identifies the business and links every section', () => {
    renderHeader();

    expect(screen.getByRole('heading', { name: 'Studio Zohar' })).toBeInTheDocument();
    expect(screen.getByText('Hair and beauty')).toBeInTheDocument();
    expect(screen.getByText('142 Dizengoff Street, Tel Aviv')).toBeInTheDocument();
    expect(screen.getByText('054-1112233')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /Appointment diary/ })).toHaveAttribute(
      'href',
      '/dashboard/appointments',
    );
    expect(screen.getByRole('link', { name: /Staff & stations/ })).toHaveAttribute('href', '/dashboard/staff');
    expect(screen.getByRole('link', { name: /Services/ })).toHaveAttribute('href', '/dashboard/services');
    expect(screen.getByRole('link', { name: /Hours & shifts/ })).toHaveAttribute('href', '/dashboard/hours');
    expect(screen.getByRole('link', { name: /Waitlist/ })).toHaveAttribute('href', '/dashboard/waitlist');
    expect(screen.getByRole('link', { name: 'Business settings' })).toHaveAttribute('href', '/dashboard/details');

    // Counts render as badges; the settings link carries none.
    expect(screen.getByRole('link', { name: /Staff & stations/ })).toHaveTextContent('1');
    expect(screen.getByRole('link', { name: /Services/ })).toHaveTextContent('2');
  });

  it('marks only the section actually being viewed', () => {
    pathname.current = '/dashboard';
    const { unmount } = renderHeader();
    expect(screen.queryByRole('link', { current: 'page' })).not.toBeInTheDocument();
    unmount();

    pathname.current = '/dashboard/services';
    renderHeader();
    expect(screen.getByRole('link', { current: 'page' })).toHaveAttribute('href', '/dashboard/services');
  });

  it('flags a business that is no longer active', () => {
    renderHeader({ status: 'SUSPENDED' });
    expect(screen.getByText('Business suspended')).toBeInTheDocument();
  });
});
