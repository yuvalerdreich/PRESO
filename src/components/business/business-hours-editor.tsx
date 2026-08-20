'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, CopyPlus, Plus, Save, Store, Trash2, Zap } from 'lucide-react';

import { ErrorNotice } from '@/components/common/error-dialog';
import { DashboardSectionHeader } from '@/components/business/dashboard-section-header';
import { actionButton, actionButtonLarge } from '@/components/common/button-styles';
import { surfaceCard } from '@/components/common/card-styles';
import { fieldPadding, surfaceField } from '@/components/common/field-styles';
import { useLanguage } from '@/lib/i18n/language-provider';
import { setOperatingHours } from '@/server/actions/business';
import type { BusinessHourRow } from '@/types/domain';

type Window = { opensAt: string; closesAt: string };
/** Index 0 = Sunday, matching `business_hours.day_of_week`. An empty list means closed that day. */
type Week = Window[][];

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const DEFAULT_WINDOW: Window = { opensAt: '09:00', closesAt: '17:00' };

/**
 * The business's opening hours — the outer boundary of §2's invariant.
 *
 * This is the missing half of the availability engine as far as the app was concerned: the column
 * and the action existed from the start, but nothing ever called `setOperatingHours`, so every
 * business opened through the wizard had **zero** `business_hours` rows and
 * `business_hours ∩ employee windows` was empty on every day of the week. Staff could set shifts
 * all they liked and no client was ever offered a slot. Hence the notice at the top when there are
 * no hours at all: that state is not "not filled in yet", it is "nobody can book here".
 *
 * It lives on `/businesses/manage/hours`, above the per-employee shifts, because the nav entry names
 * both ("טווח שעות ומשמרות") and because the boundary should be visible while the shifts inside it
 * are being set — the shift rows below already warn when one falls outside these hours.
 *
 * A day is a *list* of windows, not one range: `business_hours` has no unique key on
 * `(business_id, day_of_week)` precisely so a midday break is expressible (§12.19), and
 * `setOperatingHoursInput` rejects only overlap, never multiplicity. Closed is the empty list —
 * the same thing the DDL says by having no row.
 *
 * §12.1: any ACTIVE employee may save this, not only the founder. That is why there is no
 * ownership check here — the action and RLS agree, so the screen has nothing to take back.
 */
export function BusinessHoursEditor({
  businessId,
  businessHours,
}: {
  businessId: string;
  businessHours: BusinessHourRow[];
}) {
  const { copy } = useLanguage();
  const hours = copy.dashboard.hoursScreen;
  const router = useRouter();

  const [week, setWeek] = useState<Week>(() => toWeek(businessHours));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const isClosedAllWeek = week.every((windows) => windows.length === 0);

  function updateDay(day: number, next: Window[]) {
    setWeek((current) => current.map((windows, index) => (index === day ? next : windows)));
  }

  function save() {
    setError(null);

    const overlappingDay = week.findIndex(hasOverlap);
    if (overlappingDay !== -1) {
      setError(hours.businessOverlapError.replace('{day}', weekdayLabel(hours, overlappingDay)));
      return;
    }

    const invalidDay = week.findIndex((windows) => windows.some((w) => w.closesAt <= w.opensAt));
    if (invalidDay !== -1) {
      setError(hours.businessRangeError.replace('{day}', weekdayLabel(hours, invalidDay)));
      return;
    }

    startTransition(async () => {
      const result = await setOperatingHours({
        businessId,
        // Replace-all, so a day removed here is a day deleted there — closing a day is simply
        // sending no window for it (§4.5).
        rows: week.flatMap((windows, dayOfWeek) => windows.map((window) => ({ dayOfWeek, ...window }))),
      });

      if (!result.ok) {
        setError(Object.values(result.error.fields ?? {})[0] || result.error.message || hours.businessSaveError);
        return;
      }

      setSavedAt(Date.now());
      router.refresh();
    });
  }

  return (
    <div className={`${surfaceCard} gap-4 p-4 sm:p-5`}>
      <DashboardSectionHeader
        icon={Store}
        title={hours.businessSectionTitle}
        description={hours.businessSectionDescription}
        action={
          <button
            type="button"
            onClick={() => setWeek(QUICK_WEEK())}
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-3.5 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            <Zap className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
            {hours.businessQuickFill}
          </button>
        }
      />

      {isClosedAllWeek ? (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {hours.businessNoHoursNotice}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {WEEKDAYS.map((day) => {
          const windows = week[day];
          const isOpen = windows.length > 0;

          return (
            <li
              key={day}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] p-3"
            >
              <span className="w-24 shrink-0 text-sm font-bold text-[var(--foreground)]">
                {weekdayLabel(hours, day)}
              </span>

              <button
                type="button"
                onClick={() => updateDay(day, isOpen ? [] : [{ ...DEFAULT_WINDOW }])}
                aria-pressed={isOpen}
                className={`inline-flex w-20 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl px-3 py-1.5 text-sm font-bold transition-colors ${
                  isOpen ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-[var(--muted)] hover:bg-slate-200'
                }`}
              >
                {isOpen ? hours.businessOpen : hours.businessClosedDay}
              </button>

              {isOpen ? (
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {windows.map((window, index) => (
                    <span key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={window.opensAt}
                        aria-label={`${weekdayLabel(hours, day)} — ${hours.from}`}
                        onChange={(event) =>
                          updateDay(
                            day,
                            windows.map((w, i) => (i === index ? { ...w, opensAt: event.target.value } : w)),
                          )
                        }
                        className={`${surfaceField} ${fieldPadding} w-auto py-1.5 font-bold`}
                      />
                      <span className="text-sm text-[var(--muted)]">–</span>
                      <input
                        type="time"
                        value={window.closesAt}
                        aria-label={`${weekdayLabel(hours, day)} — ${hours.to}`}
                        onChange={(event) =>
                          updateDay(
                            day,
                            windows.map((w, i) => (i === index ? { ...w, closesAt: event.target.value } : w)),
                          )
                        }
                        className={`${surfaceField} ${fieldPadding} w-auto py-1.5 font-bold`}
                      />
                      {windows.length > 1 ? (
                        <button
                          type="button"
                          aria-label={`${hours.businessRemoveWindow} ${index + 1}`}
                          onClick={() => updateDay(day, windows.filter((_, i) => i !== index))}
                          className="cursor-pointer rounded-full p-1.5 text-rose-500 transition-colors hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </span>
                  ))}

                  <button
                    type="button"
                    aria-label={`${hours.businessAddWindow} — ${weekdayLabel(hours, day)}`}
                    onClick={() => updateDay(day, [...windows, nextWindow(windows)])}
                    className="cursor-pointer rounded-full p-1.5 text-[var(--brand)] transition-colors hover:bg-[var(--soft-violet)]"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>

                  <button
                    type="button"
                    aria-label={hours.businessCopyToAll.replace('{day}', weekdayLabel(hours, day))}
                    title={hours.businessCopyToAll.replace('{day}', weekdayLabel(hours, day))}
                    onClick={() => setWeek(WEEKDAYS.map(() => windows.map((window) => ({ ...window }))))}
                    className="ms-auto cursor-pointer rounded-full p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--soft-violet)] hover:text-[var(--brand)]"
                  >
                    <CopyPlus className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <span className="text-sm text-[var(--muted)]">{hours.businessClosedHint}</span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className={`${actionButton} ${actionButtonLarge} shadow-lg`}
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {isPending ? hours.businessSaving : hours.businessSave}
        </button>

        {error ? <ErrorNotice description={error} /> : null}
        {savedAt && !error ? (
          <p
            role="status"
            className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {hours.businessSaved}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Rows to a week of seven lists. A day with no rows is closed, which is what the DDL says too. */
function toWeek(rows: BusinessHourRow[]): Week {
  return WEEKDAYS.map((day) =>
    rows
      .filter((row) => row.dayOfWeek === day)
      .map((row) => ({ opensAt: row.opensAt, closesAt: row.closesAt }))
      .sort((a, b) => a.opensAt.localeCompare(b.opensAt)),
  );
}

/** Sunday–Thursday, 09:00–17:00 — the ordinary Israeli working week, as a starting point. */
const QUICK_WEEK = (): Week => WEEKDAYS.map((day) => (day <= 4 ? [{ ...DEFAULT_WINDOW }] : []));

/** A second window starts an hour after the last one closed — a midday break, usually. */
function nextWindow(windows: Window[]): Window {
  const last = windows[windows.length - 1];
  if (!last) return { ...DEFAULT_WINDOW };

  const opens = Math.min(toMinutes(last.closesAt) + 60, 22 * 60);
  return { opensAt: toHHmm(opens), closesAt: toHHmm(Math.min(opens + 240, 23 * 60 + 59)) };
}

function hasOverlap(windows: Window[]): boolean {
  const sorted = [...windows].sort((a, b) => a.opensAt.localeCompare(b.opensAt));
  return sorted.some((window, index) => index > 0 && window.opensAt < sorted[index - 1].closesAt);
}

function weekdayLabel(
  copy: { weekdayPrefix: string; weekdays: readonly string[] },
  day: number,
): string {
  return `${copy.weekdayPrefix} ${copy.weekdays[day]}`.trim();
}

function toMinutes(timeHHmm: string): number {
  const [h, m] = timeHHmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function toHHmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
