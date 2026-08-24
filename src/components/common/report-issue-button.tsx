'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle2, LifeBuoy } from 'lucide-react';

import { actionButton } from '@/components/common/button-styles';
import { fieldPadding, surfaceFieldSubtle } from '@/components/common/field-styles';
import { Modal } from '@/components/common/modal';
import { useLanguage } from '@/lib/i18n/language-provider';
import { createReport } from '@/server/actions/moderation';

/**
 * The nav sidebar's "נתקלת בבעיה? לחץ לדיווח" entry (TECHNICAL_DESIGN.md §12.76). Unlike
 * "My appointments"/"Profile settings" this needs no shared Context — nothing else in the tree
 * opens it — so it owns its own open/closed state locally, the same self-contained shape
 * `ServiceFormModal` uses.
 *
 * Always files a `targetType: 'GENERAL'` report (`targetId: null`) — "I hit a problem," not
 * "I hit a problem with X." Reporting *something specific* (a business, a user, an appointment)
 * is a capability `createReport` already supports but nothing in the client/business UI calls yet
 * (§12.76's own open note) — this button is deliberately the general case only.
 */
export function ReportIssueButton() {
  const { copy } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-auto flex w-full items-center gap-3 rounded-full px-4 py-3 text-start text-sm font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--soft-violet)] hover:text-[var(--foreground)]"
      >
        <LifeBuoy className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span>{copy.sidebar.reportIssue}</span>
      </button>

      {isOpen ? <ReportIssueModal onClose={() => setIsOpen(false)} /> : null}
    </>
  );
}

function ReportIssueModal({ onClose }: { onClose: () => void }) {
  const { copy } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createReport({
        targetType: 'GENERAL',
        targetId: null,
        description: String(form.get('description') ?? ''),
      });

      if (!result.ok) {
        setError(result.error.message || copy.reportIssue.error);
        return;
      }

      setIsSent(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Swap content, keep the window — the same "confirm → thank-you" shape BookingConfirmDialog
  // already uses, rather than closing and toasting.
  if (isSent) {
    return (
      <Modal onClose={onClose} closeLabel={copy.reportIssue.close} ariaLabel={copy.reportIssue.successTitle}>
        <div className="flex flex-col items-center gap-4 px-2 py-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="text-xl font-extrabold text-[var(--foreground)]">{copy.reportIssue.successTitle}</h2>
          <p className="max-w-md text-sm leading-6 text-[var(--muted)]">{copy.reportIssue.successDescription}</p>
          <button
            type="button"
            onClick={onClose}
            className={`${actionButton} mt-1 w-full rounded-full px-4 py-3 text-sm`}
          >
            {copy.reportIssue.doneAction}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} closeLabel={copy.reportIssue.close} ariaLabel={copy.reportIssue.title}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--foreground)]">{copy.reportIssue.title}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{copy.reportIssue.description}</p>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-[var(--foreground)]">{copy.reportIssue.fieldLabel}</span>
          <textarea
            name="description"
            rows={4}
            required
            minLength={10}
            maxLength={1000}
            placeholder={copy.reportIssue.placeholder}
            className={`${surfaceFieldSubtle} ${fieldPadding} resize-none`}
          />
        </label>

        {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`${actionButton} flex-1 rounded-full px-4 py-3 text-sm`}
          >
            {isSubmitting ? copy.reportIssue.pending : copy.reportIssue.submit}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={`${actionButton} flex-1 rounded-full px-4 py-3 text-sm`}
          >
            {copy.reportIssue.cancel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
