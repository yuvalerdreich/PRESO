import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

import { AppointmentsPanel } from '@/components/client/appointments-panel';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import type { ClientAppointment, ClientWaitlistEntry } from '@/types/domain';

/**
 * Fixtures are declared here rather than read from a repository.
 *
 * They used to come from `appointmentsRepository`, which was a mock; now that the real reader is
 * `server/queries/appointments.ts` — a database call — a component test has no business invoking
 * it. The shape below is what that query returns, and stating it inline also makes the counts
 * these assertions depend on visible at the point of use instead of hidden in a shared fixture.
 */
function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function loadFixture(): { appointments: ClientAppointment[]; waitlistEntries: ClientWaitlistEntry[] } {
  return {
    appointments: [
      {
        id: '2a0e4e0e-8f5c-4a1e-9a3f-1c0b2d3e4f50',
        businessId: 'business-zohar',
        employeeId: 'employee-zohar',
        serviceId: 'service-haircut',
        businessName: 'Studio Zohar - מספרת זוהר',
        employeeName: 'זוהר לוי',
        serviceName: 'תספורת ועיצוב שיער',
        address: 'רחוב דיזנגוף 142, תל אביב',
        dateISO: daysFromNow(5),
        time: '11:30',
        status: 'CONFIRMED',
      },
      {
        // Past-dated, so it belongs to History regardless of status.
        id: '3b1f5f1f-9a6d-4b2f-8b4a-2d1c3e4f5a61',
        businessName: 'Glow Clinic קליניקת אסתטיקה',
        employeeName: 'דנה כהן',
        serviceName: 'טיפול פנים מתקדם',
        address: 'שדרות אבא אבן 8, הרצליה',
        dateISO: daysFromNow(-10),
        time: '09:00',
        status: 'CONFIRMED',
      },
    ],
    waitlistEntries: [
      {
        id: '4c2a6a2a-0b7e-4c3a-9c5b-3e2d4f5a6b72',
        businessName: 'Glow Clinic קליניקת אסתטיקה',
        employeeName: 'נועה גולן',
        serviceName: 'גוונים רכים',
        requestedDateISO: daysFromNow(7),
        requestedRange: '08:00 - 22:00',
        status: 'ACTIVE',
      },
    ],
  };
}

function renderPanel(appointments: ClientAppointment[], waitlistEntries: ClientWaitlistEntry[]) {
  render(
    <LanguageProvider initialLocale="en">
      <AppointmentsPanel appointments={appointments} waitlistEntries={waitlistEntries} />
    </LanguageProvider>,
  );
}

describe('appointments panel', () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows appointment tabs and opens/closes the cancel dialog', () => {
    const { appointments, waitlistEntries } = loadFixture();
    renderPanel(appointments, waitlistEntries);

    expect(screen.getByRole('heading', { level: 1, name: 'My appointments and requests' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /waitlist/i }));
    expect(screen.getByText(/גוונים רכים · נועה גולן/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /upcoming/i }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel appointment' })[0]);
    expect(screen.getByRole('dialog', { name: 'Cancel this appointment?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the same provider and service in reschedule mode', () => {
    const { appointments, waitlistEntries } = loadFixture();
    renderPanel(appointments, waitlistEntries);

    fireEvent.click(screen.getByRole('button', { name: 'Reschedule appointment' }));

    expect(push).toHaveBeenCalledWith(
      `/b/${appointments[0].businessId}/e/${appointments[0].employeeId}/s/${appointments[0].serviceId}?reschedule=${appointments[0].id}`,
    );
  });

  /**
   * The cancel is a real `PATCH /api/appointments/[id]`, so what this asserts is the request and
   * the refresh — not a local list edit. The row only moves to History once the server component
   * that supplied `appointments` re-runs and hands back `status: 'CANCELLED'`, which is exactly
   * what `router.refresh()` triggers and what a component test cannot observe.
   */
  it('cancels through the API and refreshes the server data', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'CANCELLED' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const { appointments, waitlistEntries } = loadFixture();
    renderPanel(appointments, waitlistEntries);

    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel appointment' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel it' }));

    await waitFor(() => expect(refresh).toHaveBeenCalled());

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/appointments/${appointments[0].id}`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ action: 'cancel' }) }),
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /history/i })).toHaveAttribute('aria-selected', 'true');
  });

  /**
   * §8.4's envelope carries the sentence the user needs — most importantly the 422 raised when the
   * business's cancellation window has already closed. The dialog stays open showing it.
   */
  it('keeps the dialog open and shows the API error message when cancelling fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'UNPROCESSABLE', message: 'This business asks for 24 hours notice to cancel.' },
        }),
        { status: 422 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { appointments, waitlistEntries } = loadFixture();
    renderPanel(appointments, waitlistEntries);

    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel appointment' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel it' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This business asks for 24 hours notice to cancel.');
    expect(screen.getByRole('dialog', { name: 'Cancel this appointment?' })).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('labels each tab with a count that reflects the appointment/waitlist data', () => {
    const { appointments, waitlistEntries } = loadFixture();
    const upcomingCount = appointments.filter((a) => a.status !== 'CANCELLED' && a.dateISO >= todayISO()).length;
    const historyCount = appointments.length - upcomingCount;

    renderPanel(appointments, waitlistEntries);

    expect(screen.getByRole('tab', { name: new RegExp(`upcoming\\s*${upcomingCount}`, 'i') })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: new RegExp(`waitlist\\s*${waitlistEntries.length}`, 'i') })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: new RegExp(`history\\s*${historyCount}`, 'i') })).toBeInTheDocument();
  });

  it('moves a CANCELLED row into History', () => {
    const { appointments, waitlistEntries } = loadFixture();
    const cancelled = appointments.map((appointment, index) =>
      index === 0 ? { ...appointment, status: 'CANCELLED' as const } : appointment,
    );

    renderPanel(cancelled, waitlistEntries);

    expect(screen.getByRole('tab', { name: /upcoming\s*0/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /history\s*2/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /history/i }));
    expect(screen.getAllByText('Cancelled').length).toBeGreaterThan(0);
  });

  it('shows the empty state on a tab with no rows, and does not affect the other tabs', () => {
    const { appointments } = loadFixture();
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
