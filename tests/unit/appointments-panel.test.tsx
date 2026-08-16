import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppointmentsPanel } from '@/components/client/appointments-panel';
import { appointmentsRepository } from '@/lib/appointments/repository';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import type { ClientAppointment, ClientWaitlistEntry } from '@/types/domain';

async function loadFixture() {
  const [appointments, waitlistEntries] = await Promise.all([
    appointmentsRepository.listCurrentClientAppointments(),
    appointmentsRepository.listCurrentClientWaitlistEntries(),
  ]);
  return { appointments, waitlistEntries };
}

function renderPanel(appointments: ClientAppointment[], waitlistEntries: ClientWaitlistEntry[]) {
  render(
    <LanguageProvider initialLocale="en">
      <AppointmentsPanel appointments={appointments} waitlistEntries={waitlistEntries} />
    </LanguageProvider>,
  );
}

describe('appointments panel', () => {
  it('shows appointment tabs and keeps cancellation local to the panel', async () => {
    const { appointments, waitlistEntries } = await loadFixture();
    renderPanel(appointments, waitlistEntries);

    expect(screen.getByRole('heading', { level: 1, name: 'My appointments and requests' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /waitlist/i }));
    expect(screen.getByText(/גוונים רכים · נועה גולן/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /upcoming/i }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel appointment' })[0]);
    expect(screen.getByRole('dialog', { name: 'Cancel this appointment?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel appointment' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel in demo' }));

    expect(screen.getByRole('tab', { name: /history\s*2/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Cancelled in demo only')).toBeInTheDocument();
  });

  it('labels each tab with a count that reflects the appointment/waitlist data, and updates it after cancelling', async () => {
    const { appointments, waitlistEntries } = await loadFixture();
    const upcomingCount = appointments.filter((a) => a.status !== 'CANCELLED' && a.dateISO >= todayISO()).length;
    const historyCount = appointments.length - upcomingCount;

    renderPanel(appointments, waitlistEntries);

    expect(screen.getByRole('tab', { name: new RegExp(`upcoming\\s*${upcomingCount}`, 'i') })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: new RegExp(`waitlist\\s*${waitlistEntries.length}`, 'i') })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: new RegExp(`history\\s*${historyCount}`, 'i') })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel appointment' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel in demo' }));

    expect(screen.getByRole('tab', { name: new RegExp(`upcoming\\s*${upcomingCount - 1}`, 'i') })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: new RegExp(`history\\s*${historyCount + 1}`, 'i') })).toBeInTheDocument();
    // Cancelling an appointment never touches the waitlist tab's count.
    expect(screen.getByRole('tab', { name: new RegExp(`waitlist\\s*${waitlistEntries.length}`, 'i') })).toBeInTheDocument();
  });

  it('shows the empty state on a tab with no rows, and does not affect the other tabs', async () => {
    const { appointments } = await loadFixture();
    renderPanel(appointments, []);

    expect(screen.getByRole('tab', { name: /waitlist\s*0/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /waitlist/i }));
    expect(screen.getByText('You have no waitlist requests.')).toBeInTheDocument();
  });
});

function todayISO(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
