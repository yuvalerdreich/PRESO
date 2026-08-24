'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, LifeBuoy } from 'lucide-react';

import { actionButton, actionButtonSelectedOnLight } from '@/components/common/button-styles';
import { cardChip, surfaceCard } from '@/components/common/card-styles';
import { EmptyState } from '@/components/common/empty-state';
import { fieldPadding, fieldPaddingEndIcon, surfaceField, surfaceFieldSubtle } from '@/components/common/field-styles';
import { Modal } from '@/components/common/modal';
import { PanelHero } from '@/components/common/panel-hero';
import { useLanguage } from '@/lib/i18n/language-provider';
import { resolveReport } from '@/server/actions/admin';
import type { ReportSummary } from '@/types/domain';

const TARGET_BADGE_STYLES: Record<ReportSummary['targetType'], string> = {
  BUSINESS: 'bg-sky-50 text-sky-700',
  PROFILE: 'bg-[var(--soft-violet)] text-[var(--brand-deep)]',
  APPOINTMENT: 'bg-amber-50 text-amber-700',
  GENERAL: 'bg-slate-100 text-slate-600',
};

const STATUS_BADGE_STYLES: Record<ReportSummary['status'], string> = {
  OPEN: 'bg-amber-50 text-amber-700',
  RESOLVED: 'bg-emerald-50 text-emerald-700',
  DISMISSED: 'bg-slate-100 text-slate-600',
};

/**
 * `/admin/reports` (TECHNICAL_DESIGN.md §12.76) — the moderation queue ARCHITECTURE.md §2.4/§4.5
 * already specced (`resolveReport`, "admin moderation queue") but never had a screen. Filtering is
 * client-side over the whole list, the same in-place shape `AdminUsersPage` established — this
 * platform's report volume is not worth a server round trip per filter click.
 */
export function AdminReportsPage({ reports }: { reports: ReportSummary[] }) {
  const { copy } = useLanguage();
  const router = useRouter();

  const [status, setStatus] = useState<ReportSummary['status'] | ''>('OPEN');
  const [target, setTarget] = useState<ReportSummary | null>(null);

  const counts = useMemo(
    () => ({
      open: reports.filter((report) => report.status === 'OPEN').length,
      resolved: reports.filter((report) => report.status === 'RESOLVED').length,
      dismissed: reports.filter((report) => report.status === 'DISMISSED').length,
      total: reports.length,
    }),
    [reports],
  );

  const visibleReports = useMemo(
    () => (status ? reports.filter((report) => report.status === status) : reports),
    [reports, status],
  );

  function targetLabel(report: ReportSummary): string {
    if (report.targetType === 'GENERAL') return copy.admin.reports.generalTargetLabel;
    return report.targetLabel || report.targetId || '';
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PanelHero title={copy.admin.reports.title} description={copy.admin.reports.description} icon={LifeBuoy}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile value={counts.open} label={copy.admin.reports.stats.open} valueClassName="text-amber-300" />
          <StatTile value={counts.resolved} label={copy.admin.reports.stats.resolved} valueClassName="text-emerald-300" />
          <StatTile value={counts.dismissed} label={copy.admin.reports.stats.dismissed} valueClassName="text-slate-300" />
          <StatTile value={counts.total} label={copy.admin.reports.stats.total} valueClassName="text-white" />
        </div>
      </PanelHero>

      <div role="group" aria-label={copy.admin.reports.filters.statusLabel} className={`${surfaceCard} gap-4 p-5 sm:p-6`}>
        <div className="grid gap-4 sm:max-w-xs">
          <div className="relative">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as ReportSummary['status'] | '')}
              className={`picker-select ${surfaceField} ${fieldPaddingEndIcon} cursor-pointer appearance-none font-semibold`}
            >
              <option value="">{copy.admin.reports.filters.statusAll}</option>
              <option value="OPEN">{copy.admin.reports.filters.statusOpen}</option>
              <option value="RESOLVED">{copy.admin.reports.filters.statusResolved}</option>
              <option value="DISMISSED">{copy.admin.reports.filters.statusDismissed}</option>
            </select>
            <ChevronDown
              className="pointer-events-none absolute inset-y-0 my-auto h-4 w-4 text-[var(--brand)] ltr:right-4 rtl:left-4"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {visibleReports.length > 0 ? (
        <div className={`${surfaceCard} overflow-x-auto p-0`}>
          <table className="w-full min-w-[820px] text-start text-sm">
            <thead>
              <tr className="border-b border-[var(--line)] bg-slate-50/70 text-xs font-bold text-[var(--muted)]">
                <th className="px-5 py-3 text-start">{copy.admin.reports.table.reporter}</th>
                <th className="px-5 py-3 text-start">{copy.admin.reports.table.target}</th>
                <th className="px-5 py-3 text-start">{copy.admin.reports.table.description}</th>
                <th className="px-5 py-3 text-start">{copy.admin.reports.table.status}</th>
                <th className="px-5 py-3 text-start">{copy.admin.reports.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {visibleReports.map((report) => (
                <tr key={report.id}>
                  <td className="px-5 py-4 font-bold text-[var(--foreground)]">{report.reporterName}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1.5">
                      <span className={`${cardChip} ${TARGET_BADGE_STYLES[report.targetType]}`}>
                        {copy.admin.reports.targetType[report.targetType]}
                      </span>
                      <span className="text-xs text-[var(--muted)]">{targetLabel(report)}</span>
                    </div>
                  </td>
                  <td className="max-w-xs px-5 py-4 text-[var(--muted)]">
                    <p className="line-clamp-2">{report.description}</p>
                    {report.status !== 'OPEN' ? (
                      <p className="mt-1 text-xs italic text-[var(--muted)]">
                        {report.resolutionNote || copy.admin.reports.noResolutionNote}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`${cardChip} ${STATUS_BADGE_STYLES[report.status]}`}>
                      {copy.admin.reports.status[report.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {report.status === 'OPEN' ? (
                      <button
                        type="button"
                        onClick={() => setTarget(report)}
                        className="rounded-full border border-[var(--brand-blue)]/30 bg-[var(--soft-violet)] px-3 py-1.5 text-xs font-bold text-[var(--brand-deep)] transition-colors hover:bg-[var(--brand-blue)]/15"
                      >
                        {copy.admin.reports.resolveAction}
                      </button>
                    ) : (
                      <span className="text-xs font-semibold italic text-[var(--muted)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={LifeBuoy} title={copy.admin.reports.emptyTitle} description={copy.admin.reports.emptyDescription} />
      )}

      {target ? (
        <ResolveReportDialog
          report={target}
          onClose={() => setTarget(null)}
          onResolved={() => {
            setTarget(null);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function StatTile({ value, label, valueClassName }: { value: number; label: string; valueClassName: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className={`text-2xl font-extrabold ${valueClassName}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-300">{label}</p>
    </div>
  );
}

function ResolveReportDialog({
  report,
  onClose,
  onResolved,
}: {
  report: ReportSummary;
  onClose: () => void;
  onResolved: () => void;
}) {
  const { copy } = useLanguage();
  const [outcome, setOutcome] = useState<'RESOLVED' | 'DISMISSED'>('RESOLVED');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setError(null);

    try {
      const note = String(form.get('note') ?? '').trim();
      const result = await resolveReport({ id: report.id, outcome, note: note || undefined });

      if (!result.ok) {
        setError(result.error.message || copy.admin.reports.error);
        return;
      }

      onResolved();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} closeLabel={copy.admin.reports.close} ariaLabel={copy.admin.reports.resolveDialogTitle}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[var(--foreground)]">{copy.admin.reports.resolveDialogTitle}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{copy.admin.reports.resolveDialogDescription}</p>
        </div>

        <p className="rounded-2xl border border-[var(--line)] bg-slate-50/70 p-3 text-sm text-[var(--muted)]">
          {report.description}
        </p>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-bold text-[var(--foreground)]">{copy.admin.reports.outcomeLabel}</span>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setOutcome('RESOLVED')}
              className={`${actionButton} flex-1 rounded-2xl px-3.5 py-2 text-sm ${
                outcome === 'RESOLVED' ? actionButtonSelectedOnLight : ''
              }`}
            >
              {copy.admin.reports.outcomeResolved}
            </button>
            <button
              type="button"
              onClick={() => setOutcome('DISMISSED')}
              className={`${actionButton} flex-1 rounded-2xl px-3.5 py-2 text-sm ${
                outcome === 'DISMISSED' ? actionButtonSelectedOnLight : ''
              }`}
            >
              {copy.admin.reports.outcomeDismissed}
            </button>
          </div>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-[var(--foreground)]">{copy.admin.reports.noteLabel}</span>
          <textarea
            name="note"
            rows={3}
            maxLength={1000}
            placeholder={copy.admin.reports.notePlaceholder}
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
            {isSubmitting ? copy.admin.reports.pendingResolve : copy.admin.reports.confirmResolve}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={`${actionButton} flex-1 rounded-full px-4 py-3 text-sm`}
          >
            {copy.admin.reports.cancel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
