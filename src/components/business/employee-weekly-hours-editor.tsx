'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CopyPlus, Plus, Save, Trash2, Zap } from 'lucide-react';

import { ErrorNotice } from '@/components/common/error-dialog';
import { actionButton, actionButtonLarge } from '@/components/common/button-styles';
import { surfaceCard } from '@/components/common/card-styles';
import { fieldPadding, surfaceField } from '@/components/common/field-styles';
import { useLanguage } from '@/lib/i18n/language-provider';
import { setWeeklyAvailability } from '@/server/actions/availability';
import type { AvailabilityRule } from '@/types/domain';

type Window = { opensAt: string; closesAt: string };
/** Index 0 = Sunday, matching `employee_availability_rules.day_of_week`. Empty = no shift that day. */
type Week = Window[][];

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const DEFAULT_WINDOW: Window = { opensAt: '09:00', closesAt: '17:00' };

/**
 * An employee's recurring weekly pattern (§12.67) — replace-all across the whole week in one save,
 * the same shape `BusinessHoursEditor` used for `business_hours` before this component replaced it.
 *
 * This is the *only* default a date without its own exception falls back to; the date editor beside
 * it (`DateScheduleEditor`) is what overrides a single day. Nothing here checks that shift against
 * the business's own opening hours — that check lives on the date editor, which is where a
 * shift is actually placed against a real calendar day; this screen edits a pattern, not a day.
 *
 * Working hours belong to the person who works them (§12.1's one exception: any employee may edit
 * the *business's* hours, but never a colleague's own schedule) — `setWeeklyAvailability` refuses
 * any `employeeId` but the caller's own and RLS re-checks it, so a colleague's pattern renders with
 * every control disabled rather than offering ones that would be rejected.
 */
export function EmployeeWeeklyHoursEditor({
  employeeId,
  isEditable,
  rules,
}: {
  employeeId: string;
  isEditable: boolean;
  rules: AvailabilityRule[];
}) {
  const { copy } = useLanguage();
  const hours = copy.dashboard.hoursScreen;
  const router = useRouter();

  const [week, setWeek] = useState<Week>(() => toWeek(rules));
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function updateDay(day: number, next: Window[]) {
    setWeek((current) => current.map((windows, index) => (index === day ? next : windows)));
  }

  function save() {
    if (!isEditable) return;
    setError(null);

    const overlappingDay = week.findIndex(hasOverlap);
    if (overlappingDay !== -1) {
      setError(hours.weeklyOverlapError.replace('{day}', weekdayLabel(hours, overlappingDay)));
      return;
    }

    const invalidDay = week.findIndex((windows) => windows.some((w) => w.closesAt <= w.opensAt));
    if (invalidDay !== -1) {
      setError(hours.weeklyRangeError.replace('{day}', weekdayLabel(hours, invalidDay)));
      return;
    }

    startTransition(async () => {
      const result = await setWeeklyAvailability({
        employeeId,
        // Replace-all, so a day removed here is a day deleted there — closing a day is simply
        // sending no window for it.
        rows: week.flatMap((windows, dayOfWeek) =>
          windows.map((window) => ({ dayOfWeek, startsAt: window.opensAt, endsAt: window.closesAt })),
        ),
      });

      if (!result.ok) {
        setError(Object.values(result.error.fields ?? {})[0] || result.error.message || hours.weeklySaveError);
        return;
      }

      setSavedAt(Date.now());
      router.refresh();
    });
  }

  return (
    <div role="region" aria-label={hours.weeklyTitle} className={`${surfaceCard} gap-4 p-4 sm:p-5`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold text-[var(--brand)]">{hours.weeklyTitle}</p>
        <div className="flex flex-wrap items-center gap-2">
          {isEditable ? (
            <button
              type="button"
              onClick={() => setWeek(QUICK_WEEK())}
              className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-3.5 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              <Zap className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
              {hours.weeklyQuickFill}
            </button>
          ) : null}
          {isEditable ? (
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className={`${actionButton} ${actionButtonLarge} shadow-lg`}
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              {isPending ? hours.weeklySaving : hours.weeklySave}
            </button>
          ) : null}
        </div>
      </div>

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
                disabled={!isEditable}
                onClick={() => updateDay(day, isOpen ? [] : [{ ...DEFAULT_WINDOW }])}
                aria-pressed={isOpen}
                className={`inline-flex w-20 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl px-3 py-1.5 text-sm font-bold transition-colors disabled:cursor-not-allowed ${
                  isOpen ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-[var(--muted)] hover:bg-slate-200'
                }`}
              >
                {isOpen ? hours.weeklyOpen : hours.weeklyClosedDay}
              </button>

              {isOpen ? (
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  {windows.map((window, index) => (
                    <span key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={window.opensAt}
                        disabled={!isEditable}
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
                        disabled={!isEditable}
                        aria-label={`${weekdayLabel(hours, day)} — ${hours.to}`}
                        onChange={(event) =>
                          updateDay(
                            day,
                            windows.map((w, i) => (i === index ? { ...w, closesAt: event.target.value } : w)),
                          )
                        }
                        className={`${surfaceField} ${fieldPadding} w-auto py-1.5 font-bold`}
                      />
                      {isEditable && windows.length > 1 ? (
                        <button
                          type="button"
                          aria-label={`${hours.weeklyRemoveWindow} ${index + 1}`}
                          onClick={() => updateDay(day, windows.filter((_, i) => i !== index))}
                          className="cursor-pointer rounded-full p-1.5 text-rose-500 transition-colors hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </span>
                  ))}

                  {isEditable ? (
                    <button
                      type="button"
                      aria-label={`${hours.weeklyAddWindow} — ${weekdayLabel(hours, day)}`}
                      onClick={() => updateDay(day, [...windows, nextWindow(windows)])}
                      className="cursor-pointer rounded-full p-1.5 text-[var(--brand)] transition-colors hover:bg-[var(--soft-violet)]"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}

                  {isEditable ? (
                    <button
                      type="button"
                      aria-label={hours.weeklyCopyToAll.replace('{day}', weekdayLabel(hours, day))}
                      title={hours.weeklyCopyToAll.replace('{day}', weekdayLabel(hours, day))}
                      onClick={() => setWeek(WEEKDAYS.map(() => windows.map((window) => ({ ...window }))))}
                      className="ms-auto cursor-pointer rounded-full p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--soft-violet)] hover:text-[var(--brand)]"
                    >
                      <CopyPlus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              ) : (
                <span className="text-sm text-[var(--muted)]">{hours.weeklyClosedHint}</span>
              )}
            </li>
          );
        })}
      </ul>

      {error ? <ErrorNotice description={error} /> : null}
      {savedAt && !error ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {hours.weeklySaved}
        </p>
      ) : null}
    </div>
  );
}

/** Rules to a week of seven lists. A day with no WEEKLY_WINDOW rows has no shift, which is what the read-back everywhere else on this screen already means. */
function toWeek(rules: AvailabilityRule[]): Week {
  return WEEKDAYS.map((day) =>
    rules
      .filter((rule) => rule.kind === 'WEEKLY_WINDOW' && rule.dayOfWeek === day)
      .map((rule) => ({ opensAt: rule.startsAt ?? '09:00', closesAt: rule.endsAt ?? '17:00' }))
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

function weekdayLabel(copy: { weekdayPrefix: string; weekdays: readonly string[] }, day: number): string {
  return `${copy.weekdayPrefix} ${copy.weekdays[day]}`.trim();
}

function toMinutes(timeHHmm: string): number {
  const [h, m] = timeHHmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function toHHmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}
