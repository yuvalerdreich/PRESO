'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock, Mail, Phone, UserRound, Users, X } from 'lucide-react';

import { DashboardSectionHeader } from '@/components/business/dashboard-section-header';
import {
  JoinRequestDecisionDialog,
  type JoinRequestDecision,
} from '@/components/business/join-request-decision-dialog';
import { StaffMemberCard } from '@/components/business/staff-member-card';
import { actionButton, actionButtonChip } from '@/components/common/button-styles';
import {
  cardHoverLift,
  cardMetaIcon,
  cardMetaList,
  cardMetaRow,
  cardSubtitle,
  cardTitle,
  surfaceCard,
} from '@/components/common/card-styles';
import { EmptyState } from '@/components/common/empty-state';
import { useLanguage } from '@/lib/i18n/language-provider';
import { decideJoinRequest } from '@/server/actions/employee';
import type { DashboardEmployee, JoinRequestSummary } from '@/types/domain';

/**
 * `/businesses/manage/staff` — the roster and the join queue, one screen, in that order.
 *
 * They are two views of one thing: §6.8 rule 5 says approval is what *creates* staff, so a request
 * in the second section becomes a card in the first. Splitting them across two routes (the target
 * tree's `/businesses/manage/staff` + `/businesses/manage/staff/requests`) would hide that, and would bury the one
 * section that is actually waiting on someone behind a second click.
 *
 * Deciding is the founder's alone (§12.1 — it is the only power an employee lacks). A non-founder
 * still sees the queue, since they may need to know who is coming, but gets a note instead of the
 * buttons; `decide_join_request()` re-checks it and RLS is the third layer, so this is presentation
 * only, never the enforcement.
 */
export function DashboardStaffPage({
  employees,
  requests,
  isOwner,
}: {
  employees: DashboardEmployee[];
  /** PENDING only — a decided request has become a roster card or nothing at all. */
  requests: JoinRequestSummary[];
  isOwner: boolean;
}) {
  const { copy } = useLanguage();
  const router = useRouter();
  const [target, setTarget] = useState<{ request: JoinRequestSummary; decision: JoinRequestDecision } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmDecision(positionTitle: string) {
    if (!target) return;
    setError(null);

    startTransition(async () => {
      const result = await decideJoinRequest({
        id: target.request.id,
        decision: target.decision,
        positionTitle,
      });

      if (!result.ok) {
        setError(result.error.message || copy.dashboard.staff.decideError);
        return;
      }

      setTarget(null);
      // The action revalidates `/businesses/manage/staff`; this re-runs the server component holding both
      // lists, so an approved request leaves the queue and arrives on the roster in one step.
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-4">
        <DashboardSectionHeader
          icon={Users}
          title={copy.dashboard.staff.rosterTitle.replace('{count}', String(employees.length))}
          description={copy.dashboard.staff.rosterDescription}
        />

        {employees.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {employees.map((employee) => (
              <StaffMemberCard key={employee.id} employee={employee} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={UserRound}
            title={copy.dashboard.staff.emptyRosterTitle}
            description={copy.dashboard.staff.emptyRosterDescription}
          />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <DashboardSectionHeader
          icon={Clock}
          title={copy.dashboard.staff.requestsTitle.replace('{count}', String(requests.length))}
          description={copy.dashboard.staff.requestsDescription}
        />

        {requests.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {requests.map((request) => (
              <JoinRequestCard
                key={request.id}
                request={request}
                isOwner={isOwner}
                pending={isPending}
                onDecide={(decision) => {
                  setError(null);
                  setTarget({ request, decision });
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Clock}
            title={copy.dashboard.staff.emptyRequestsTitle}
            description={copy.dashboard.staff.emptyRequestsDescription}
          />
        )}
      </section>

      {target ? (
        <JoinRequestDecisionDialog
          request={target.request}
          decision={target.decision}
          pending={isPending}
          error={error}
          onConfirm={confirmDecision}
          onClose={() => {
            setTarget(null);
            setError(null);
          }}
        />
      ) : null}
    </div>
  );
}

function JoinRequestCard({
  request,
  isOwner,
  pending,
  onDecide,
}: {
  request: JoinRequestSummary;
  isOwner: boolean;
  pending: boolean;
  onDecide: (decision: JoinRequestDecision) => void;
}) {
  const { copy } = useLanguage();

  return (
    <article className={`${surfaceCard} ${cardHoverLift} h-full gap-4 p-4`}>
      <div className="min-w-0">
        <h3 className={cardTitle}>{request.fullName}</h3>
        <p className={`mt-1 ${cardSubtitle}`}>
          {copy.dashboard.staff.requestedAt.replace('{date}', request.createdAt.slice(0, 10))}
        </p>
      </div>

      <div className={cardMetaList}>
        <span className={cardMetaRow}>
          <Phone className={cardMetaIcon} aria-hidden="true" />
          {request.phone ?? copy.dashboard.staff.noPhone}
        </span>
        <span className={cardMetaRow}>
          <Mail className={cardMetaIcon} aria-hidden="true" />
          <span className="truncate">{request.email ?? copy.dashboard.staff.noEmail}</span>
        </span>
      </div>

      {isOwner ? (
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => onDecide('APPROVED')}
            className={`${actionButton} ${actionButtonChip}`}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
            {copy.dashboard.staff.approve}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onDecide('REJECTED')}
            className={`${actionButton} ${actionButtonChip}`}
          >
            <X className="h-4 w-4" aria-hidden="true" />
            {copy.dashboard.staff.reject}
          </button>
        </div>
      ) : (
        <p className="mt-auto pt-1 text-xs font-semibold text-[var(--muted)]">
          {copy.dashboard.staff.ownerOnlyNotice}
        </p>
      )}
    </article>
  );
}
