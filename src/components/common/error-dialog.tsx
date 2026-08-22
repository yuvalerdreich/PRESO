'use client';

import Link from 'next/link';
import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

import { actionButton, actionButtonLarge } from '@/components/common/button-styles';
import { Modal } from '@/components/common/modal';
import { useLanguage } from '@/lib/i18n/language-provider';

/**
 * The project's one error surface (TECHNICAL_DESIGN.md §12.56).
 *
 * Every failure the app reports wears this: a red alert mark, a title saying what could not be
 * done, a sentence saying why, and — when the answer is somewhere else in the app — a link that
 * goes there. Only the words change between call sites. A single component rather than a shared
 * stylesheet, because the part that drifts is never the colour: it is whether the icon is there,
 * whether the title is a sentence or a heading, and whether the way out is offered at all.
 *
 * **Dialog or notice.** `ErrorDialog` interrupts — it belongs over the screen the person was
 * already on, which is the whole point: an error about "this business" is answered while looking
 * at that business, not on a separate page that has lost the context. `ErrorNotice` is the same
 * anatomy without the modal chrome, for a failure that belongs *inside* a form beside the button
 * that caused it. Both are exported from here so the pair stays one design.
 *
 * `action` is optional and is a real navigation, not a second dismiss: offer it only where the
 * user can actually do something elsewhere ("manage this business in העסקים שלי").
 */
/** Either a real navigation, or an in-place action (e.g. opening another modal) — see the two call shapes below. */
type ErrorDialogAction =
  | { href: string; label: string; icon?: ReactNode; onClick?: never }
  | { onClick: () => void; label: string; icon?: ReactNode; href?: never };

export function ErrorDialog({
  title,
  description,
  action,
  onClose,
}: {
  title: string;
  description: ReactNode;
  action?: ErrorDialogAction;
  onClose: () => void;
}) {
  const { copy } = useLanguage();

  return (
    <Modal onClose={onClose} closeLabel={copy.common.close} ariaLabel={title}>
      <div className="flex flex-col items-center gap-4 px-2 py-4 text-center">
        <ErrorMark />

        <h2 role="alert" className="text-xl font-extrabold text-[var(--foreground)]">
          {title}
        </h2>

        <p className="max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p>

        {action?.href ? (
          <Link href={action.href} className={`${actionButton} ${actionButtonLarge} mt-1 shadow-lg`}>
            {action.icon}
            {action.label}
          </Link>
        ) : action?.onClick ? (
          <button
            type="button"
            onClick={action.onClick}
            className={`${actionButton} ${actionButtonLarge} mt-1 shadow-lg`}
          >
            {action.icon}
            {action.label}
          </button>
        ) : null}
      </div>
    </Modal>
  );
}

/**
 * The same error, said inside a form rather than over the screen.
 *
 * Used where the failure belongs next to the control that produced it — a save that was refused, a
 * field the server would not accept — because a modal there would hide the very form the person
 * has to correct.
 */
export function ErrorNotice({
  title,
  description,
  className = '',
}: {
  /** Optional: a one-line failure is usually clearer as the sentence alone. */
  title?: string;
  description: ReactNode;
  className?: string;
}) {
  return (
    <p
      role="alert"
      className={`flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700 ${className}`}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
      <span>
        {title ? <span className="block font-extrabold text-rose-800">{title}</span> : null}
        <span className="font-medium">{description}</span>
      </span>
    </p>
  );
}

/** The mark itself, so the dialog and anything else that needs it cannot drift apart. */
export function ErrorMark() {
  return (
    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
      <AlertCircle className="h-7 w-7" aria-hidden="true" />
    </span>
  );
}
