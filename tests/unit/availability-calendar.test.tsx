import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AvailabilityCalendar } from '@/components/public/availability-calendar';
import { LanguageProvider } from '@/lib/i18n/language-provider';

const basePath = '/b/business-1/e/employee-1/s/service-1';

function renderCalendar(availableDates: string[]) {
  return render(
    <LanguageProvider initialLocale="en">
      <AvailabilityCalendar
        basePath={basePath}
        employeeName="Zohar Levi"
        monthISO="2026-01"
        selectedDate="2026-01-20"
        availableDates={availableDates}
      />
    </LanguageProvider>,
  );
}

describe('availability calendar', () => {
  beforeEach(() => {
    // 2026-01-15 — mid-month, so the fixture has real past and future days either side of it.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('links a future date with open slots to the slot picker, circled white', () => {
    renderCalendar(['2026-01-20']);

    const link = screen.getByText('20').closest('a');
    expect(link).toHaveAttribute('href', `${basePath}?month=2026-01&date=2026-01-20`);
    expect(link).toHaveClass('bg-white');
  });

  it('links a future date with no open slots straight into joining the waitlist, circled grey', () => {
    renderCalendar(['2026-01-20']);

    const link = screen.getByText('25').closest('a');
    expect(link).toHaveAttribute('href', `${basePath}?month=2026-01&date=2026-01-25&waitlist=1`);
    expect(link).toHaveClass('bg-white/25');
    expect(link).not.toHaveClass('bg-white');
  });

  it('leaves a past date unclickable, exactly as before', () => {
    renderCalendar(['2026-01-20']);

    const pastCell = screen.getByText('10');
    expect(pastCell.closest('a')).not.toBeInTheDocument();
    expect(pastCell.tagName).toBe('SPAN');
  });

  it('still treats today as clickable-available when it has open slots', () => {
    renderCalendar(['2026-01-15']);

    const link = screen.getByText('15').closest('a');
    expect(link).toHaveAttribute('href', `${basePath}?month=2026-01&date=2026-01-15`);
  });
});
