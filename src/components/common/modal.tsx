'use client';

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Every modal in the app renders through here, and it renders into `document.body` — not where it
 * was written (§12.57).
 *
 * `position: fixed` is only viewport-relative while no ancestor has a `transform`, `filter` or
 * `perspective`; any of those makes that ancestor the containing block, and the "full-screen"
 * overlay is then trapped inside it. The discovery card is exactly that case — `cardHoverLift`'s
 * `hover:-translate-y-1` — so an error dialog opened from a card first drew *inside* the card, and
 * then flickered: the overlay took the pointer, the hover ended, the transform went away, the modal
 * jumped to the viewport, the pointer was over the card again, and round it went. `overflow-hidden`
 * on the same card would have clipped it regardless.
 *
 * A portal fixes the class of bug rather than that one call site, which is why it lives here rather
 * than in the card. Nothing else changes: the markup, the Esc handler and the backdrop click are
 * the same, and `screen.getByRole('dialog')` still finds it, since testing-library queries the
 * whole document.
 */

/**
 * Which modal Escape belongs to (§12.60).
 *
 * Modal-in-modal is a real pattern here — a confirmation over the form it is confirming, profile
 * settings over the header — and every open `Modal` used to listen for Escape independently, so one
 * keypress closed the whole stack: dismissing "delete this service?" also threw away the form
 * behind it, with the edits in it. Escape means "back out of the thing on top", never "close
 * everything", so only the last modal to mount acts on it.
 *
 * Module-level because it is genuinely global — it is the document's key event being arbitrated,
 * and a Context would have to be threaded through call sites that have no other reason to know a
 * modal is open. Registration is keyed on a per-instance token held in a ref rather than on the
 * `onClose` identity, which is usually an inline arrow: re-registering on every parent render would
 * shuffle a modal to the top of the stack without it having opened.
 */
const modalStack: symbol[] = [];

export function Modal({
  onClose,
  closeLabel,
  ariaLabel,
  children,
}: {
  onClose: () => void;
  closeLabel: string;
  ariaLabel?: string;
  children: ReactNode;
}) {
  // `document` does not exist while this renders on the server, so the portal waits for the
  // client. `useSyncExternalStore` with a never-firing subscription is the standard way to ask
  // "am I on the client yet" without setting state from an effect, which React's own lint rule
  // (`react-hooks/set-state-in-effect`) rejects — and rightly: that pattern renders twice.
  const isClient = useSyncExternalStore(subscribeToNothing, () => true, () => false);

  const tokenRef = useRef<symbol | null>(null);
  tokenRef.current ??= Symbol('modal');

  // Mount/unmount only — the stack is about opening order, not about render count.
  useEffect(() => {
    const token = tokenRef.current!;
    modalStack.push(token);

    return () => {
      const index = modalStack.indexOf(token);
      if (index !== -1) modalStack.splice(index, 1);
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      // Only the topmost modal backs out; see the note on `modalStack`.
      if (modalStack[modalStack.length - 1] !== tokenRef.current) return;
      onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!isClient) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onClick={(event) => event.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className="absolute top-4 rtl:left-4 ltr:right-4 flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--soft-violet)] hover:text-[var(--foreground)]"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Nothing ever changes, so the store never notifies — only the server/client snapshots differ. */
function subscribeToNothing() {
  return () => {};
}
