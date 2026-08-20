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

/**
 * Every weekday open 07:00–21:00, so a shift inside those hours raises no warning.
 *
 * The times are deliberately ones no shift fixture uses: the opening-hours editor renders on this
 * same screen and puts these into `<input type="time">`s of its own, so a shared value would make
 * "the shift form invented times" and "the business opens then" indistinguishable to a query.
 */
const businessHours: BusinessHourRow[] = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
  id: `hours-${dayOfWeek}`,
  dayOfWeek,
  opensAt: '07:00',
  closesAt: '21:00',
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
        businessId="business-zohar"
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

  it('reads a day with no windows as a day off — which is what the engine makes of it', () => {
    renderHours({ rules: [] });

    expect(screen.getByRole('button', { name: 'Day off' })).toHaveAttribute('aria-pressed', 'true');
    // No times nobody saved: the empty day must round-trip as it was left.
    expect(screen.queryByDisplayValue('08:00')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('09:00')).not.toBeInTheDocument();
  });

  it('flips to a day off when the last shift is removed, and saves it as one', async () => {
    save.mockResolvedValueOnce({ ok: true, data: { written: 1, replaced: 1 } });
    renderHours();

    fireEvent.click(screen.getByRole('button', { name: /Remove shift/ }));

    expect(screen.getByRole('button', { name: 'Day off' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Save changes for this date' }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(expect.objectContaining({ isDayOff: true, shifts: [] })),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it('refuses to save a working day with no shifts, and says why', async () => {
    renderHours();

    fireEvent.click(screen.getByRole('button', { name: /Remove shift/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Working this day' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save changes for this date' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A working day cannot be saved with no shifts. Add at least one, or mark the day as a day off.',
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('offers the date itself as the only date control — no relative-day shortcuts', () => {
    renderHours();

    expect(screen.queryByRole('button', { name: 'Tomorrow' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'In two days' })).not.toBeInTheDocument();
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

    expect(push).toHaveBeenCalledWith('/businesses/manage/hours?employee=employee-miya', { scroll: false });
  });

  it('shows the field’s own message, not the generic “correct the highlighted fields”', async () => {
    save.mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Please correct the highlighted fields.',
        fields: { shifts: 'Shifts on one day cannot overlap' },
      },
    });
    renderHours();

    fireEvent.click(screen.getByRole('button', { name: 'Save changes for this date' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Shifts on one day cannot overlap');
  });

  it('reports a refused save instead of pretending it landed', async () => {
    save.mockResolvedValueOnce({ ok: false, error: { code: 'VALIDATION', message: 'Shifts cannot overlap.' } });
    renderHours();

    fireEvent.click(screen.getByRole('button', { name: 'Save changes for this date' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Shifts cannot overlap.');
    expect(refresh).not.toHaveBeenCalled();
  });
});
