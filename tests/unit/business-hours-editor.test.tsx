import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refresh = vi.hoisted(() => vi.fn());
const save = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));
vi.mock('@/server/actions/business', () => ({
  setOperatingHours: save,
}));

import { BusinessHoursEditor } from '@/components/business/business-hours-editor';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import type { BusinessHourRow } from '@/types/domain';

const BUSINESS_ID = 'business-zohar';

function renderEditor(businessHours: BusinessHourRow[] = []) {
  return render(
    <LanguageProvider initialLocale="en">
      <BusinessHoursEditor businessId={BUSINESS_ID} businessHours={businessHours} />
    </LanguageProvider>,
  );
}

/** Sunday 09:00–17:00 with a midday break, which `business_hours` allows and the editor must show. */
const splitSunday: BusinessHourRow[] = [
  { id: 'h1', dayOfWeek: 0, opensAt: '09:00', closesAt: '13:00' },
  { id: 'h2', dayOfWeek: 0, opensAt: '16:00', closesAt: '20:00' },
];

describe('business opening hours editor', () => {
  beforeEach(() => {
    refresh.mockClear();
    save.mockClear();
  });

  it('says outright that a business with no hours cannot be booked at all', () => {
    renderEditor();

    expect(screen.getByText(/nothing is offered on any day/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Closed' })).toHaveLength(7);
  });

  it('reads a split day back as two windows rather than collapsing it', () => {
    renderEditor(splitSunday);

    expect(screen.getByDisplayValue('09:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('13:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('16:00')).toBeInTheDocument();
    expect(screen.getByDisplayValue('20:00')).toBeInTheDocument();
    expect(screen.queryByText(/nothing is offered on any day/i)).not.toBeInTheDocument();
  });

  it('saves the whole week as one replace-all payload, closed days simply absent', async () => {
    save.mockResolvedValueOnce({ ok: true, data: { businessId: BUSINESS_ID, rows: 5 } });
    renderEditor();

    fireEvent.click(screen.getByRole('button', { name: /Quick fill/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save opening hours' }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        businessId: BUSINESS_ID,
        rows: [0, 1, 2, 3, 4].map((dayOfWeek) => ({ dayOfWeek, opensAt: '09:00', closesAt: '17:00' })),
      }),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent('Opening hours saved');
  });

  it('closing a day removes its windows from the payload', async () => {
    save.mockResolvedValueOnce({ ok: true, data: { businessId: BUSINESS_ID, rows: 0 } });
    renderEditor(splitSunday);

    // The only open day, closed — the replace-all payload becomes empty, which is how a day's
    // hours are removed (there is no per-row delete).
    fireEvent.click(screen.getByRole('button', { name: 'Open' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save opening hours' }));

    await waitFor(() => expect(save).toHaveBeenCalledWith({ businessId: BUSINESS_ID, rows: [] }));
  });

  it('refuses overlapping windows before the round trip, naming the day', async () => {
    renderEditor([
      { id: 'h1', dayOfWeek: 0, opensAt: '09:00', closesAt: '14:00' },
      { id: 'h2', dayOfWeek: 0, opensAt: '12:00', closesAt: '18:00' },
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'Save opening hours' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Two windows on Sunday overlap');
    expect(save).not.toHaveBeenCalled();
  });

  it('refuses a closing time that is not after the opening time', async () => {
    renderEditor([{ id: 'h1', dayOfWeek: 1, opensAt: '09:00', closesAt: '17:00' }]);

    fireEvent.change(screen.getByDisplayValue('17:00'), { target: { value: '08:00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save opening hours' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Closing time on Monday');
    expect(save).not.toHaveBeenCalled();
  });

  it('copies one day’s hours across the week', async () => {
    save.mockResolvedValueOnce({ ok: true, data: { businessId: BUSINESS_ID, rows: 7 } });
    renderEditor([{ id: 'h1', dayOfWeek: 0, opensAt: '10:00', closesAt: '19:00' }]);

    fireEvent.click(screen.getByRole('button', { name: /Apply Sunday’s hours to every day/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save opening hours' }));

    await waitFor(() => expect(save.mock.calls[0][0].rows).toHaveLength(7));
    expect(save.mock.calls[0][0].rows.every((row: { opensAt: string }) => row.opensAt === '10:00')).toBe(true);
  });
});
