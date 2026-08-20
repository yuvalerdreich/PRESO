'use client';

import { useState } from 'react';

import { ErrorNotice } from '@/components/common/error-dialog';
import { actionButton } from '@/components/common/button-styles';
import { fieldPadding, surfaceFieldSubtle } from '@/components/common/field-styles';
import { Modal } from '@/components/common/modal';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { JoinRequestSummary } from '@/types/domain';

export type JoinRequestDecision = 'APPROVED' | 'REJECTED';

/**
 * Approve or reject one join request. Both decisions confirm first (§10.8): `decide_join_request()`
 * refuses to re-decide a settled request — `illegal_transition` — so neither outcome is undoable
 * from the UI, and a reject in particular costs the applicant a whole new request.
 *
 * Approval asks for the position title, because that is the field approval actually writes:
 * §6.8 rule 5 means no `employees` row exists until this moment, so this is where the chair gets
 * named. The RPC defaults it to 'Staff'; leaving the founder to accept a silent English default on
 * a Hebrew-first screen would be the wrong kind of convenience.
 */
export function JoinRequestDecisionDialog({
  request,
  decision,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  request: JoinRequestSummary;
  decision: JoinRequestDecision;
  pending?: boolean;
  /** `error.message` from `ActionResult`, shown verbatim — the dialog stays open on failure. */
  error?: string | null;
  onConfirm: (positionTitle: string) => void;
  onClose: () => void;
}) {
  const { copy } = useLanguage();
  const [positionTitle, setPositionTitle] = useState('');
  const isApproval = decision === 'APPROVED';

  const title = isApproval ? copy.dashboard.staff.approveTitle : copy.dashboard.staff.rejectTitle;
  const description = (
    isApproval ? copy.dashboard.staff.approveDescription : copy.dashboard.staff.rejectDescription
  ).replace('{name}', request.fullName);

  return (
    <Modal onClose={onClose} closeLabel={copy.dashboard.staff.cancel} ariaLabel={title}>
      <div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>

      <div className="rounded-2xl bg-[var(--soft-violet)] p-4 text-sm">
        <p className="font-semibold text-[var(--foreground)]">{request.fullName}</p>
        <p className="text-[var(--brand-deep)]">
          {[request.phone, request.email].filter(Boolean).join(' • ')}
        </p>
      </div>

      {isApproval ? (
        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-[var(--foreground)]">
            {copy.dashboard.staff.positionTitleLabel}
          </span>
          <input
            type="text"
            value={positionTitle}
            onChange={(event) => setPositionTitle(event.target.value)}
            placeholder={copy.dashboard.staff.positionTitlePlaceholder}
            className={`${surfaceFieldSubtle} ${fieldPadding}`}
          />
        </label>
      ) : null}

      {error ? (
        <ErrorNotice description={error} />
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className={`${actionButton} flex-1 rounded-full px-4 py-3 text-sm`}
        >
          {copy.dashboard.staff.cancel}
        </button>
        <button
          type="button"
          // An empty field falls through to the staff-role label rather than to the RPC's English
          // 'Staff' default; the schema's 2-character minimum would reject '' outright.
          onClick={() => onConfirm(positionTitle.trim() || copy.dashboard.staff.staffRole)}
          disabled={pending}
          className={`${actionButton} flex-1 rounded-full px-4 py-3 text-sm`}
        >
          {isApproval ? copy.dashboard.staff.confirmApprove : copy.dashboard.staff.confirmReject}
        </button>
      </div>
    </Modal>
  );
}
