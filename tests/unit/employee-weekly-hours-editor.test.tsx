import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refresh = vi.hoisted(() => vi.fn());
const save = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));
vi.mock('@/server/actions/availability', () => ({
  setWeeklyAvailability: save,
}));

import { EmployeeWeeklyHoursEditor } from '@/components/business/employee-weekly-hours-editor';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import type { AvailabilityRule } from '@/types/domain';

const EMPLOYEE_ID = 'employee-zohar';

function renderEditor(rules: AvailabilityRule[] = [], isEditable = true) {
  return render(
    <LanguageProvider initialLocale="en">
      <EmployeeWeeklyHoursEditor employeeId={EMPLOYEE_ID} isEditable={isEditable} rules={rules} />
    </LanguageProvider>,
  );
}

function weeklyRule(overrides: Partial<AvailabilityRule>): AvailabilityRule {
  return {
    id: 'rule-1',
    employeeId: EMPLOYEE_ID,
    kind: 'WEEKLY_WINDOW',
    dayOfWeek: 0,
    startsAt: '09:00',
    endsAt: '17:00',
    effectiveFrom: null,
    effectiveTo: null,
    ...overrides,
  };
}

/** Sunday 09:00–13:00 with a midday break, which `employee_availability_rules` allows. */
const splitSunday: AvailabilityRule[] = [
  weeklyRule({ id: 'r1', startsAt: '09:00', endsAt: '13:00' }),
  weeklyRule({ id: 'r2', startsAt: '16:00', endsAt: '20:00' }),
];

describe('employee weekly hours editor', () => {
  beforeEach(() => {
    refresh.mockClear();
    save.mockClear();
  });

  it('reads every day as closed with no WEEKLY_WINDOW rules', () => {
    renderEditor();

    expect(screen.getAllByRole('button', { name: 'Closed' })).toHaveLength(7);
  });

  it('reads a split day back as two windows rather than collapsing it', () => {
    renderEditor(splitSunday);

    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('13:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('16:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20:00')).toBeInTheDocument();
  });

  it('ignores rules of other kinds — only WEEKLY_WINDOW belongs to this editor', () => {
    renderEditor([
      weeklyRule({ id: 'r1', kind: 'EXCEPTION', dayOfWeek: null, effectiveFrom: '2026-01-01T00:00:00Z', effectiveTo: '2026-01-02T00:00:00Z' }),
    ]);

    expect(screen.getAllByRole('button', { name: 'Closed' })).toHaveLength(7);
  });

  it('saves the whole week as one replace-all payload, closed days simply absent', async () => {
    save.mockResolvedValueOnce({ ok: true, data: { employeeId: EMPLOYEE_ID, rows: 5 } });
    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: /Quick fill/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save recurring times' }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        employeeId: EMPLOYEE_ID,
        rows: [0, 1, 2, 3, 4].map((dayOfWeek) => ({ dayOfWeek, startsAt: '09:00', endsAt: '17:00' })),
      }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent('Recurring times saved');
  });

  it('closing a day removes its windows from the payload', async () => {
    save.mockResolvedValueOnce({ ok: true, data: { employeeId: EMPLOYEE_ID, rows: 0 } });
    renderEditor(splitSunday);

    // The only open day, closed — the replace-all payload becomes empty, which is how a day's
    // hours are removed (there is no per-row delete).
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save recurring times' }));

    await waitFor(() => expect(save).toHaveBeenCalledWith({ employeeId: EMPLOYEE_ID, rows: [] }));
  });

  it('refuses overlapping windows before the round trip, naming the day', async () => {
    renderEditor([
      weeklyRule({ id: 'r1', startsAt: '09:00', endsAt: '14:00' }),
      weeklyRule({ id: 'r2', startsAt: '12:00', endsAt: '18:00' }),
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Save recurring times' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Two windows on Sunday overlap');
    expect(save).not.toHaveBeenCalled();
  });

  it('refuses an end time that is not after the start time', async () => {
    renderEditor([weeklyRule({ id: 'r1', dayOfWeek: 1, startsAt: '09:00', endsAt: '17:00' })]);

    fireEvent.change(screen.getByDisplayValue('17:00'), { target: { value: '08:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save recurring times' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('The end time on Monday');
    expect(save).not.toHaveBeenCalled();
  });

  it('copies one day’s hours across the week', async () => {
    save.mockResolvedValueOnce({ ok: true, data: { employeeId: EMPLOYEE_ID, rows: 7 } });
    renderEditor([weeklyRule({ id: 'r1', startsAt: '10:00', endsAt: '19:00' })]);

    fireEvent.click(screen.getByRole('button', { name: /Apply Sunday’s hours to every day/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save recurring times' }));

    await waitFor(() => expect(save.mock.calls[0][0].rows).toHaveLength(7));
    expect(save.mock.calls[0][0].rows.every((row: { startsAt: string }) => row.startsAt === '10:00')).toBe(true);
  });

  it('disables every control and hides the save/quick-fill actions when read-only', () => {
    renderEditor(splitSunday, false);

    expect(screen.queryByRole('button', { name: 'Save recurring times' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Quick fill/ })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('09:00')).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Open' })[0]).toBeDisabled();
  });
});
