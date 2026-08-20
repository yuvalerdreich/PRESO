import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ErrorDialog, ErrorNotice } from '@/components/common/error-dialog';
import { LanguageProvider } from '@/lib/i18n/language-provider';

function wrap(node: React.ReactNode) {
  return render(<LanguageProvider initialLocale="en">{node}</LanguageProvider>);
}

describe('the shared error surface (§12.56)', () => {
  it('states the failure, and offers the way out only when there is one', () => {
    const onClose = vi.fn();
    const { unmount } = wrap(
      <ErrorDialog title="Cannot do that" description="Because of this." onClose={onClose} />,
    );

    expect(screen.getByRole('dialog')).toHaveTextContent('Cannot do that');
    expect(screen.getByRole('alert')).toHaveTextContent('Cannot do that');
    expect(screen.getByText('Because of this.')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    unmount();

    wrap(
      <ErrorDialog
        title="Cannot do that"
        description="Because of this."
        action={{ href: '/businesses', label: 'Go to My businesses' }}
        onClose={onClose}
      />,
    );
    expect(screen.getByRole('link', { name: 'Go to My businesses' })).toHaveAttribute('href', '/businesses');
  });

  it('closes on the close button and on Escape, like every other modal', () => {
    const onClose = vi.fn();
    wrap(<ErrorDialog title="Cannot do that" description="Because of this." onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('says the same thing inline, where a modal would hide the form being corrected', () => {
    wrap(<ErrorNotice title="Save failed" description="Two windows on Sunday overlap." />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Save failed');
    expect(alert).toHaveTextContent('Two windows on Sunday overlap.');
    // Red, not the amber that means "warning" elsewhere in the app.
    expect(alert.className).toContain('text-rose-700');
  });
});

describe('modals escape their container (§12.57)', () => {
  it('renders into document.body, not inside a transformed ancestor', () => {
    // The discovery card is exactly this: `cardHoverLift` applies `hover:-translate-y-1`, and a
    // transformed ancestor becomes the containing block for `position: fixed` — which drew the
    // dialog *inside* the card, clipped by its `overflow-hidden`, flickering as the hover toggled.
    const { container } = wrap(
      <div className="overflow-hidden" style={{ transform: 'translateY(-4px)' }}>
        <ErrorDialog title="Cannot do that" description="Because of this." onClose={() => {}} />
      </div>,
    );

    const dialog = screen.getByRole('dialog');
    expect(document.body.contains(dialog)).toBe(true);
    expect(container.contains(dialog)).toBe(false);
  });
});
