import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.hoisted(() => vi.fn());
const refresh = vi.hoisted(() => vi.fn());
const save = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));
vi.mock('@/server/actions/availability', () => ({
  setDaySchedule: save,
}));

import { DashboardHoursPage } from '@/components/business/dashboard-hours-page';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import type { AvailabilityRule, BusinessHourRow, DashboardEmployee } from '@/types/domain';

const TIMEZONE = 'Asia/Jerusalem';

const me: DashboardEmployee = {
  id: 'employee-zohar',
  profileId: 'profile-zohar',
  fullName: 'Zohar Levi',
  avatarUrl: '',
  positionTitle: 'Chair 1',
  status: 'ACTIVE',
  phone: null,
  email: null,
  serviceCount: 2,
  isOwner: true,
};

const colleague: DashboardEmployee = { ...me, id: 'employee-miya', fullName: 'Miya Bar', isOwner: false };

/** Every weekday open 08:00–20:00, so a shift inside those hours raises no warning. */
const businessHours: BusinessHourRow[] = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  id: `hours-${dayOfWeek}`,
  dayOfWeek,
  opensAt: '08:00',
  closesAt: '20:00',
}));

const weeklyRules: AvailabilityRule[] = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  id: `rule-${dayOfWeek}`,
  employeeId: me.id,
  kind: 'WEEKLY_WINDOW',
  dayOfWeek,
  startsAt: '09:00',
  endsAt: '17:00',
  effectiveFrom: null,
  effectiveTo: null,
}));

function renderHours({
  rules = weeklyRules,
  selected = me,
  currentEmployeeId = me.id as string | null,
} = {}) {
  return render(
    <LanguageProvider initialLocale="en">
      <DashboardHoursPage
        employees={[me, colleague]}
        selectedEmployee={selected}
        rules={rules}
        businessHours={businessHours}
        timezone={TIMEZONE}
        currentEmployeeId={currentEmployeeId}
      />
    </LanguageProvider>,
  );
}

describe('business hours & shifts screen', () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
    save.mockClear();
  });

  it('opens on the weekly pattern the engine would really apply to today', () => {
    renderHours();

    // A date with no exception of its own falls back to the weekly window — the same fallback
    // `get_available_slots()` makes, so the form shows what would actually happen.
    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('17:00')).toBeInTheDocument();
    expect(screen.getByText('Total: 8 hours')).toBeInTheDocument();
  });

  it('applies a split-shift pattern as two shifts and totals them', () => {
    renderHours();

    fireEvent.click(screen.getByRole('button', { name: 'Split (morning + evening)' }));

    expect(screen.getByDisplayValue('08:30')).toBeInTheDocument();
    expect(screen.getByDisplayValue('16:00')).toBeInTheDocument();
    expect(screen.getByText('Total: 10 hours')).toBeInTheDocument();
  });

  it('saves the day as a finished state, not as row edits', async () => {
    save.mockResolvedValueOnce({ ok: true, data: { written: 1, replaced: 1 } });
    renderHours();

    fireEvent.click(screen.getByRole('button', { name: /Morning/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes for this date' }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          employeeId: me.id,
          scope: 'DATE',
          isDayOff: false,
          shifts: [{ startsAt: '08:30', endsAt: '14:00' }],
        }),
      ),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('switches to the recurring pattern, which saves a weekday rather than a date', async () => {
    save.mockResolvedValueOnce({ ok: true, data: { written: 1, replaced: 1 } });
    renderHours();

    fireEvent.click(screen.getByRole('button', { name: 'Set recurring times (weekly)' }));
    fireEvent.click(screen.getByRole('button', { name: /Save recurring times for every/ }));

    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ scope: 'WEEKLY' })));
    expect(save.mock.calls[0][0]).not.toHaveProperty('dateISO');
    expect(save.mock.calls[0][0]).toHaveProperty('dayOfWeek');
  });

  it('warns that a day off frees nothing on its own', () => {
    renderHours();

    fireEvent.click(screen.getByRole('button', { name: 'Day off' }));

    // §6.9 — the dangerous reading is "marking a day off cancels my bookings". It does not.
    expect(screen.getByText(/Appointments already booked are not cancelled automatically/)).toBeInTheDocument();
    expect(screen.queryByDisplayValue('09:00')).not.toBeInTheDocument();
  });

  it('reads a day off back off a BLOCK rule rather than showing empty hours', () => {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(new Date());
    const rules: AvailabilityRule[] = [
      ...weeklyRules,
      {
        id: 'rule-block',
        employeeId: me.id,
        kind: 'BLOCK',
        dayOfWeek: null,
        startsAt: null,
        endsAt: null,
        effectiveFrom: new Date(`${today}T00:00:00+03:00`).toISOString(),
        effectiveTo: new Date(`${today}T23:59:59+03:00`).toISOString(),
      },
    ];

    renderHours({ rules });

    expect(screen.getByRole('button', { name: 'Day off' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows a colleague’s schedule read-only — hours belong to whoever works them', () => {
    renderHours({ selected: colleague, rules: [], currentEmployeeId: me.id });

    expect(
      screen.getByText('Miya Bar’s schedule is read-only here — everyone sets their own working hours.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes for this date' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Add a shift/ })).not.toBeInTheDocument();
  });

  it('keeps the selected employee in the URL, since it decides which rules are fetched', () => {
    renderHours();

    fireEvent.click(screen.getByRole('button', { name: /Miya Bar/ }));

    expect(push).toHaveBeenCalledWith('/dashboard/hours?employee=employee-miya', { scroll: false });
  });

  it('reports a refused save instead of pretending it landed', async () => {
    save.mockResolvedValueOnce({ ok: false, error: { code: 'VALIDATION', message: 'Shifts cannot overlap.' } });
    renderHours();

    fireEvent.click(screen.getByRole('button', { name: 'Save changes for this date' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Shifts cannot overlap.');
    expect(refresh).not.toHaveBeenCalled();
  });
});
