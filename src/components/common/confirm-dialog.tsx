'use client';

import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

import { actionButton } from '@/components/common/button-styles';
import { Modal } from '@/components/common/modal';

/**
 * The project's one confirmation surface (§12.60) — `ErrorDialog`'s sibling, and the reason
 * `window.confirm()` no longer appears anywhere in `src/`.
 *
 * A native `confirm()` is the browser's dialog, not the app's: it is chrome-coloured and
 * chrome-positioned, it announces the origin ("localhost:3000 says"), it is LTR regardless of the
 * page's direction, and its two buttons are labelled by the operating system, so the one that
 * deletes something says "OK". None of that is stylable. Worse, it blocks the main thread — the
 * screen behind it cannot repaint while it is up.
 *
 * The anatomy is deliberately `ErrorDialog`'s, one row down: a mark, a title that asks the question,
 * a sentence of consequence, and the actions. The mark is **amber, not red** — §12.56 reserves red
 * for something that has already failed, and nothing has failed here; this is a warning about what
 * is *about* to happen, which is exactly what amber was kept for.
 *
 * **Both buttons are the same blue.** `button-styles.ts`'s one rule is that every button rests at
 * `--brand-blue-dark` and only hover changes it, so the destructive action is not a red button —
 * it is named by its label ("Yes, delete"), the way `CancelAppointmentDialog` already does it. What
 * makes the consequence clear is the sentence, not the colour.
 *
 * The confirm action is first in the DOM so it takes focus first, and `pending` locks both while the
 * work is in flight — a second click on a delete is not a no-op, it is a second request.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  cancelLabel,
  closeLabel,
  pending = false,
  pendingLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** The close X's accessible name — passed in, since this component holds no copy of its own. */
  closeLabel: string;
  /** True while the confirmed action is running; both buttons lock. */
  pending?: boolean;
  pendingLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal onClose={onCancel} closeLabel={closeLabel} ariaLabel={title}>
      <div className="flex flex-col items-center gap-4 px-2 py-4 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </span>

        <h2 className="text-xl font-extrabold text-[var(--foreground)]">{title}</h2>

        <p className="max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p>

        <div className="mt-1 flex w-full flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`${actionButton} flex-1 rounded-full px-4 py-3 text-sm`}
          >
            {pending ? (pendingLabel ?? confirmLabel) : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className={`${actionButton} flex-1 rounded-full px-4 py-3 text-sm`}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
