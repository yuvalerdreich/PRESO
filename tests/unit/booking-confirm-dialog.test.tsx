import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

import { BookingConfirmDialog } from '@/components/booking/booking-confirm-dialog';
import { LanguageProvider } from '@/lib/i18n/language-provider';

const closeHref = '/b/b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1002/e/e-glow-1/s/s-glow-1?month=2026-08&date=2026-08-16';

function renderDialog() {
  return render(
    <LanguageProvider initialLocale="en">
      <BookingConfirmDialog
        closeHref={closeHref}
        employeeId="e-glow-1"
        serviceId="s-glow-1"
        businessName="Glow Clinic"
        employeeName="Dana Cohen"
        serviceName="Advanced facial"
        servicePrice={250}
        durationMinutes={50}
        dateISO="2026-08-16"
        time="09:00"
      />
    </LanguageProvider>,
  );
}

describe('booking confirm dialog', () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('shows the requested business, employee, service, date, time, duration, and price', () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: 'Confirm your appointment' })).toBeInTheDocument();
    expect(screen.getByText(/Glow Clinic/)).toBeInTheDocument();
    expect(screen.getByText(/Dana Cohen/)).toBeInTheDocument();
    expect(screen.getByText(/Advanced facial/)).toBeInTheDocument();
    expect(screen.getByText(/16\/08\/2026/)).toBeInTheDocument();
    expect(screen.getByText('Treatment duration: 50 min')).toBeInTheDocument();
    expect(screen.getByText('250₪')).toBeInTheDocument();
  });

  it('posts the booking and shows the confirmed thank-you screen with a confirmed status', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'appointment-demo-1', status: 'CONFIRMED' }),
    } as Response);

    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /^Confirm$/ }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Thank you/ })).toBeInTheDocument(),
    );

    expect(fetch).toHaveBeenCalledWith(
      '/api/appointments',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ employeeId: 'e-glow-1', serviceId: 's-glow-1', startsAt: '2026-08-16T09:00:00' }),
      }),
    );
    expect(refresh).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /View "My appointments"/ }));

    expect(push).toHaveBeenCalledWith('/me/appointments');
  });

  it('posts the booking and shows the pending thank-you screen with a pending status', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'appointment-demo-2', status: 'PENDING' }),
    } as Response);

    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /^Confirm$/ }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Thank you/ })).toBeInTheDocument(),
    );
    expect(screen.getByText('Pending approval')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Book another/ }));
    expect(push).toHaveBeenCalledWith(closeHref);
  });

  it('shows an error toast and does not navigate away when the booking request fails', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);

    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /^Confirm$/ }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(push).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('navigates back without booking anything when declined', () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: "Don't confirm" }));

    expect(push).toHaveBeenCalledWith(closeHref);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('closes via the panel close button and the Escape key', () => {
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(push).toHaveBeenCalledWith(closeHref);

    push.mockClear();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(push).toHaveBeenCalledWith(closeHref);
  });
});
