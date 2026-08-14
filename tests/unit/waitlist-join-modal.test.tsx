import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import { WaitlistJoinModal } from '@/components/public/waitlist-join-modal';
import { LanguageProvider } from '@/lib/i18n/language-provider';

const closeHref = '/b/b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001/e/e-zohar/s/s-zohar-2?month=2026-08&date=2026-08-27';

function renderModal() {
  return render(
    <LanguageProvider initialLocale="en">
      <WaitlistJoinModal
        closeHref={closeHref}
        businessName="Studio Zohar"
        employeeName="Zohar Levi"
        serviceName="Haircut and styling"
        servicePrice={120}
        dateISO="2026-08-27"
      />
    </LanguageProvider>,
  );
}

describe('waitlist join modal', () => {
  beforeEach(() => {
    push.mockClear();
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

  it('navigates back to closeHref on confirm and on cancel', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Confirm & join the waitlist/ }));
    expect(push).toHaveBeenCalledWith(closeHref);

    push.mockClear();
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
