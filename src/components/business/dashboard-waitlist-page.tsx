'use client';

import { Bell, CalendarRange, Info, Phone, Scissors, Users } from 'lucide-react';

import { DashboardSectionHeader } from '@/components/business/dashboard-section-header';
import {
  cardChip,
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
import type { DashboardWaitlistEntry, WaitlistStatus } from '@/types/domain';

const STATUS_STYLES: Partial<Record<WaitlistStatus, string>> = {
  ACTIVE: 'bg-amber-50 text-amber-800',
  MATCHED: 'bg-emerald-50 text-emerald-700',
  CLAIMED: 'bg-[var(--soft-violet)] text-[var(--brand-deep)]',
};

/**
 * `/dashboard/waitlist` — the people waiting for a cancellation, and the window each of them asked
 * for.
 *
 * Read-only on purpose. The business does not choose who gets a freed slot: cancelling an
 * appointment fires `match_waitlist_for_slot()` inside the same transaction, which notifies **every**
 * eligible entry at once (§6.7, §12.15), and the first client to confirm wins the slot through the
 * same exclusion constraint that decides every other booking race. A "notify this one" button here
 * would imply a choice the design deliberately does not offer — so the screen explains the rule
 * instead, because a business that believes it is holding a slot for someone will tell them so.
 *
 * EXPIRED entries are already filtered out server-side: a request whose own window has passed is
 * closed, not waiting.
 */
export function DashboardWaitlistPage({ entries }: { entries: DashboardWaitlistEntry[] }) {
  const { copy } = useLanguage();

  return (
    <section className="flex flex-col gap-5">
      <DashboardSectionHeader
        icon={Bell}
        title={copy.dashboard.waitlistScreen.title.replace('{count}', String(entries.length))}
        description={copy.dashboard.waitlistScreen.description}
      />

      <p className="flex items-start gap-2 rounded-2xl bg-[var(--soft-violet)] px-4 py-3 text-sm leading-6 text-[var(--brand-deep)]">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        {copy.dashboard.waitlistScreen.howItWorks}
      </p>

      {entries.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <WaitlistCard key={entry.id} entry={entry} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Bell}
          title={copy.dashboard.waitlistScreen.emptyTitle}
          description={copy.dashboard.waitlistScreen.emptyDescription}
        />
      )}
    </section>
  );
}

function WaitlistCard({ entry }: { entry: DashboardWaitlistEntry }) {
  const { copy } = useLanguage();

  const statusLabel = {
    ACTIVE: copy.dashboard.waitlistScreen.statusActive,
    MATCHED: copy.dashboard.waitlistScreen.statusMatched,
    CLAIMED: copy.dashboard.waitlistScreen.statusClaimed,
    EXPIRED: copy.dashboard.waitlistScreen.statusActive,
  }[entry.status];

  return (
    <article className={`${surfaceCard} ${cardHoverLift} h-full gap-4 p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cardTitle}>{entry.clientName || copy.dashboard.waitlistScreen.unnamedClient}</h3>
          <p className={`mt-1 ${cardSubtitle}`}>
            {copy.dashboard.waitlistScreen.joinedAt.replace('{date}', entry.createdAt.slice(0, 10))}
          </p>
        </div>
        <span className={`${cardChip} ${STATUS_STYLES[entry.status] ?? ''}`}>{statusLabel}</span>
      </div>

      <div className={cardMetaList}>
        <span className={`${cardMetaRow} items-start`}>
          <CalendarRange className={`mt-0.5 ${cardMetaIcon}`} aria-hidden="true" />
          <span>
            <span className="font-semibold text-[var(--foreground)]">
              {copy.dashboard.waitlistScreen.requestedRange}:
            </span>{' '}
            {formatRange(entry)}
          </span>
        </span>
        <span className={cardMetaRow}>
          <Scissors className={cardMetaIcon} aria-hidden="true" />
          {/* An entry may name no service and no staff member — §3.10's "any" is a real choice the
              client made, so it is labelled rather than left blank. */}
          {entry.serviceName || copy.dashboard.waitlistScreen.anyService}
        </span>
        <span className={cardMetaRow}>
          <Users className={cardMetaIcon} aria-hidden="true" />
          {entry.employeeNames.length > 0
            ? entry.employeeNames.join(', ')
            : copy.dashboard.waitlistScreen.anyEmployee}
        </span>
        <span className={cardMetaRow}>
          <Phone className={cardMetaIcon} aria-hidden="true" />
          {entry.clientPhone ? (
            <a href={`tel:${entry.clientPhone}`} className="font-semibold hover:underline">
              {entry.clientPhone}
            </a>
          ) : (
            copy.dashboard.waitlistScreen.noPhone
          )}
        </span>
      </div>

      {entry.matchedAt ? (
        <p className="mt-auto pt-1 text-xs font-semibold text-emerald-700">
          {copy.dashboard.waitlistScreen.matchedAt.replace('{date}', entry.matchedAt.slice(0, 16).replace('T', ' '))}
        </p>
      ) : null}
    </article>
  );
}

/** One day reads as "2026-08-20 09:00–17:00"; a window spanning days spells both dates out. */
function formatRange(entry: DashboardWaitlistEntry): string {
  if (entry.fromDateISO === entry.toDateISO) {
    return `${entry.fromDateISO} ${entry.fromTime}–${entry.toTime}`;
  }
  return `${entry.fromDateISO} ${entry.fromTime} – ${entry.toDateISO} ${entry.toTime}`;
}
