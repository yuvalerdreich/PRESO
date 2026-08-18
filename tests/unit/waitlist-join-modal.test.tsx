import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh }),
}));

import { WaitlistJoinModal } from '@/components/public/waitlist-join-modal';
import { LanguageProvider } from '@/lib/i18n/language-provider';

const closeHref = '/b/b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001/e/e-zohar/s/s-zohar-2?month=2026-08&date=2026-08-27';
const businessId = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001';
const employeeId = 'c29f7db0-1d55-46c9-b9ea-4f2b3d7b2002';
const serviceId = 'd3a08ec1-2e66-47da-cafb-5a3c4e8c3003';

function renderModal() {
  return render(
    <LanguageProvider initialLocale="en">
      <WaitlistJoinModal
        closeHref={closeHref}
        businessId={businessId}
        employeeId={employeeId}
        serviceId={serviceId}
        businessName="Studio Zohar"
        employeeName="Zohar Levi"
        serviceName="Haircut and styling"
        servicePrice={120}
        dateISO="2026-08-27"
      />
    </LanguageProvider>,
  );
}

/** The default: a 201 from `POST /api/waitlist`, like the real handler returns. */
function stubWaitlistApi(response = new Response(JSON.stringify({ id: 'entry-1', status: 'ACTIVE' }), { status: 201 })) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('waitlist join modal', () => {
  beforeEach(() => {
    push.mockClear();
    refresh.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the requested service, price, and date, defaulting to the flexible time range', () => {
    renderModal();

    expect(screen.getByRole('heading', { name: 'Join the waitlist' })).toBeInTheDocument();
    expect(screen.getByText('Studio Zohar • Zohar Levi')).toBeInTheDocument();
    expect(screen.getByText('Haircut and styling (120₪)')).toBeInTheDocument();
    expect(screen.getByText(/27\/08\/2026/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Flexible \/ any hour/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('lets the user pick a different preset range', () => {
    renderModal();

    const morningButton = screen.getByRole('button', { name: /Morning/ });
    fireEvent.click(morningButton);

    expect(morningButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /Flexible \/ any hour/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reveals manual from/to time inputs only once "manual" is selected', () => {
    renderModal();

    expect(screen.queryByLabelText('From')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Manual selection/ }));

    expect(screen.getByLabelText('From')).toHaveValue('08:00');
    expect(screen.getByLabelText('To')).toHaveValue('22:00');
  });

  /**
   * The confirm is a real `POST /api/waitlist`. `employeeIds` carries exactly the one employee
   * whose calendar the modal was opened from — an empty array would mean "any employee in the
   * business" (§3.10), which is not what the user asked for.
   */
  it('posts the selected range to /api/waitlist and then navigates back', async () => {
    const fetchMock = stubWaitlistApi();
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Morning/ }));
    fireEvent.click(screen.getByRole('button', { name: /Confirm & join the waitlist/ }));

    await waitFor(() => expect(push).toHaveBeenCalledWith(closeHref));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/waitlist',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          businessId,
          serviceId,
          employeeIds: [employeeId],
          fromTs: '2026-08-27T08:00:00',
          toTs: '2026-08-27T12:00:00',
        }),
      }),
    );
    expect(refresh).toHaveBeenCalled();
  });

  it('sends the manual from/to pair when "manual" is selected', async () => {
    const fetchMock = stubWaitlistApi();
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Manual selection/ }));
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '10:30' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '13:15' } });
    fireEvent.click(screen.getByRole('button', { name: /Confirm & join the waitlist/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      fromTs: '2026-08-27T10:30:00',
      toTs: '2026-08-27T13:15:00',
    });
  });

  it('stays open when the API rejects the entry', async () => {
    stubWaitlistApi(
      new Response(JSON.stringify({ error: { code: 'CONFLICT', message: 'You are already on this waiting list.' } }), {
        status: 409,
      }),
    );
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Confirm & join the waitlist/ }));

    await waitFor(() => expect(screen.getByRole('button', { name: /Confirm & join the waitlist/ })).toBeEnabled());
    expect(push).not.toHaveBeenCalled();
  });

  it('navigates back to closeHref on cancel', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(push).toHaveBeenCalledWith(closeHref);
  });

  it('closes via the panel close button and the Escape key', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(push).toHaveBeenCalledWith(closeHref);

    push.mockClear();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(push).toHaveBeenCalledWith(closeHref);
  });
});
