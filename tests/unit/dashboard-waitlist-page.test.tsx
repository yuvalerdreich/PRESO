import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DashboardWaitlistPage } from '@/components/business/dashboard-waitlist-page';
import { renderNotificationEmail } from '@/lib/email/templates';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import type { DashboardWaitlistEntry } from '@/types/domain';

const entry: DashboardWaitlistEntry = {
  id: 'entry-1',
  clientName: 'Dana Cohen',
  clientPhone: '054-1112233',
  employeeNames: ['Zohar Levi'],
  serviceName: 'Haircut',
  fromDateISO: '2026-08-25',
  fromTime: '09:00',
  toDateISO: '2026-08-25',
  toTime: '13:00',
  status: 'ACTIVE',
  createdAt: '2026-08-19T08:30:00.000Z',
  matchedAt: null,
};

/** An entry naming neither a service nor a staff member — §3.10's "any", a real choice. */
const openEntry: DashboardWaitlistEntry = {
  ...entry,
  id: 'entry-2',
  clientName: '',
  clientPhone: null,
  employeeNames: [],
  serviceName: '',
  status: 'MATCHED',
  matchedAt: '2026-08-19T09:00:00.000Z',
};

function renderWaitlist(entries: DashboardWaitlistEntry[]) {
  return render(
    <LanguageProvider initialLocale="en">
      <DashboardWaitlistPage entries={entries} />
    </LanguageProvider>,
  );
}

describe('business waitlist screen', () => {
  it('lists who is waiting, for what, and how to reach them', () => {
    renderWaitlist([entry]);

    expect(screen.getByRole('heading', { name: 'People on the waiting list (1)' })).toBeInTheDocument();
    expect(screen.getByText('Dana Cohen')).toBeInTheDocument();
    expect(screen.getByText(/2026-08-25 09:00–13:00/)).toBeInTheDocument();
    expect(screen.getByText('Haircut')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '054-1112233' })).toHaveAttribute('href', 'tel:054-1112233');
    expect(screen.getByText('Waiting')).toBeInTheDocument();
  });

  it('states the rule the business would otherwise get wrong', () => {
    renderWaitlist([entry]);

    // A business that thinks a slot is being held for one person will tell them so.
    expect(screen.getByText(/every waiting client whose requested window covers that time/i)).toBeInTheDocument();
    expect(screen.getByText(/whoever confirms first gets it/i)).toBeInTheDocument();
  });

  it('labels "any staff / any service" rather than rendering blanks', () => {
    renderWaitlist([openEntry]);

    expect(screen.getByText('Any service')).toBeInTheDocument();
    expect(screen.getByText('Any staff member')).toBeInTheDocument();
    expect(screen.getByText('Unnamed client')).toBeInTheDocument();
    expect(screen.getByText('No phone number provided')).toBeInTheDocument();
    expect(screen.getByText('Notified')).toBeInTheDocument();
  });

  it('explains an empty list', () => {
    renderWaitlist([]);

    expect(screen.getByRole('heading', { name: 'People on the waiting list (0)' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Nobody is on the waiting list right now.' }),
    ).toBeInTheDocument();
  });
});

describe('waitlist email', () => {
  const payload = {
    businessName: 'Studio Zohar',
    serviceName: 'Haircut',
    startsAt: '2026-08-25T06:00:00.000Z',
    timezone: 'Asia/Jerusalem',
    claimExpiresAt: '2026-08-25T07:00:00.000Z',
  };

  it('renders the freed slot in the business’s timezone, not the server’s', () => {
    const message = renderNotificationEmail('WAITLIST_MATCHED', payload, 'client@example.com');

    expect(message).not.toBeNull();
    expect(message!.subject).toContain('Studio Zohar');
    // 06:00 UTC is 09:00 in Jerusalem — the zone comes from the payload for exactly this reason.
    expect(message!.text).toContain('2026-08-25 09:00');
    expect(message!.html).toContain('dir="rtl"');
  });

  it('says plainly that the slot is not being held', () => {
    const message = renderNotificationEmail('WAITLIST_MATCHED', payload, 'client@example.com');

    // Every eligible client gets this same email at the same moment; the first to confirm wins.
    expect(message!.text).toContain('בו-זמנית');
    expect(message!.text).toMatch(/מי שיאשר ראשון/);
  });

  it('escapes payload text rather than interpolating it into the HTML', () => {
    const message = renderNotificationEmail(
      'WAITLIST_MATCHED',
      { ...payload, businessName: '<script>alert(1)</script>' },
      'client@example.com',
    );

    expect(message!.html).not.toContain('<script>');
    expect(message!.html).toContain('&lt;script&gt;');
  });
});
