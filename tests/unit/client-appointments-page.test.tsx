import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// See the note in home-page.test.tsx: the page reads through a cookie-bound client, so the query
// module is stubbed and this stays a composition test. The empty lists are deliberate — these
// assertions are about the panel's chrome and the back link, not about any row.
vi.mock('@/server/queries/appointments', () => ({
  listClientAppointments: async () => [],
  listClientWaitlistEntries: async () => [],
}));

// The panel calls `router.refresh()` after a real cancel, so it needs a router in jsdom.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import ClientAppointmentsPage from '@/app/(client)/me/appointments/page';
import { LanguageProvider } from '@/lib/i18n/language-provider';

describe('client appointments page', () => {
  it('renders the shared appointments panel on the route', async () => {
    render(
      <LanguageProvider initialLocale="en">
        {await ClientAppointmentsPage({ params: Promise.resolve({}), searchParams: Promise.resolve({}) })}
      </LanguageProvider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'My appointments and requests' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Back to business page/ })).not.toBeInTheDocument();
  });

  it('shows a back-to-business link when reached with a back param', async () => {
    const backHref = '/b/business-1/e/employee-1/s/service-1?date=2026-08-17';
    render(
      <LanguageProvider initialLocale="en">
        {await ClientAppointmentsPage({
          params: Promise.resolve({}),
          searchParams: Promise.resolve({ back: backHref }),
        })}
      </LanguageProvider>,
    );

    const link = screen.getByRole('link', { name: /Back to business page/ });
    expect(link).toHaveAttribute('href', backHref);
  });
});
