import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DashboardWaitlistPage } from '@/components/business/dashboard-waitlist-page';
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
