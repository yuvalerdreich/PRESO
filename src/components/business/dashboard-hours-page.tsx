'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Moon, Plus, RefreshCw, Save, Sun, Trash2, UserRound, Users, Zap } from 'lucide-react';

import { ErrorNotice } from '@/components/common/error-dialog';
import { BusinessHoursEditor } from '@/components/business/business-hours-editor';
import { DashboardSectionHeader } from '@/components/business/dashboard-section-header';
import {
  actionButton,
  actionButtonChip,
  actionButtonLarge,
  actionButtonSelectedOnLight,
} from '@/components/common/button-styles';
import { surfaceCard } from '@/components/common/card-styles';
import { fieldPadding, surfaceField } from '@/components/common/field-styles';
import { useLanguage } from '@/lib/i18n/language-provider';
import { toDateISO } from '@/lib/time';
import { setDaySchedule } from '@/server/actions/availability';
import type { AvailabilityRule, BusinessHourRow, DashboardEmployee } from '@/types/domain';

type Shift = { startsAt: string; endsAt: string };
type Mode = 'DATE' | 'WEEKLY';

/**
 * A day with no windows behind it is a **day off** — not a working day that happens to be empty.
 *
 * That is not a UI choice, it is what `get_available_slots()` makes of it: no windows means nothing
 * is offered, whatever the screen calls it. Saying "working" over an empty list would be the screen
 * disagreeing with the engine, so the two states are one, in the read-back here and in the save
 * guard below. It is also what makes a cleared day round-trip: clear the shifts, save, come back,
 * and the day still reads exactly as it was left.
 */
const EMPTY_DAY: { isDayOff: boolean; shifts: Shift[] } = { isDayOff: true, shifts: [] };

const PRESETS: { id: string; shifts: Shift[] }[] = [
  { id: 'full', shifts: [{ startsAt: '09:00', endsAt: '19:00' }] },
  { id: 'morning', shifts: [{ startsAt: '08:30', endsAt: '14:00' }] },
  { id: 'evening', shifts: [{ startsAt: '14:00', endsAt: '20:30' }] },
  {
    id: 'split',
    shifts: [
      { startsAt: '08:30', endsAt: '14:00' },
      { startsAt: '16:00', endsAt: '20:30' },
    ],
  },
];

/**
 * `/businesses/manage/hours` — one staff member's working windows, edited a day at a time.
 *
 * The screen has two scopes and the difference is the whole point of `employee_availability_rules`:
 *
 * - **A single date** writes `EXCEPTION` rows, which *replace* the weekly pattern for that day
 *   (§6.1 step 5). A day off is a whole-day `BLOCK`, because the schema's CHECK requires an
 *   EXCEPTION to carry times — "no windows at all" simply is not an exception.
 * - **Weekly** writes `WEEKLY_WINDOW` rows for that weekday, which is what every date without an
 *   exception falls back to.
 *
 * Editing a date opens pre-filled with the weekly pattern, so "today, but finishing at 15:00" is
 * two clicks rather than a blank form — and saving it is what turns the pattern into an exception
 * for that one day.
 *
 * Everything the engine will *also* apply is stated rather than silently applied: business hours
 * are the outer boundary (`business_hours ∩ employee windows`), so a shift outside opening hours
 * is flagged instead of quietly yielding no slots. And a day off never cancels anything (§6.9) —
 * the notice says so, because the alternative reading ("marking a day off frees my bookings") is
 * the dangerous one.
 *
 * Working hours belong to the person who works them: `setDaySchedule` refuses any `employeeId` but
 * the caller's own and RLS re-checks it, so a colleague's schedule renders read-only rather than
 * offering controls that would be rejected.
 */
export function DashboardHoursPage({
  businessId,
  employees,
  selectedEmployee,
  rules,
  businessHours,
  timezone,
  currentEmployeeId,
}: {
  businessId: string;
  employees: DashboardEmployee[];
  selectedEmployee: DashboardEmployee | null;
  /** Every rule of the selected employee — a date change filters these, never refetches. */
  rules: AvailabilityRule[];
  businessHours: BusinessHourRow[];
  timezone: string;
  currentEmployeeId: string | null;
}) {
  const { copy } = useLanguage();
  const router = useRouter();

  const todayISO = useMemo(() => toDateISO(new Date(), timezone), [timezone]);
  const [mode, setMode] = useState<Mode>('DATE');
  const [dateISO, setDateISO] = useState(todayISO);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dayOfWeek = weekdayOf(dateISO);
  const isEditable = selectedEmployee !== null && selectedEmployee.id === currentEmployeeId;

  const baseline = useMemo(
    () => readDay({ rules, mode, dateISO, dayOfWeek, timezone }),
    [rules, mode, dateISO, dayOfWeek, timezone],
  );

  // Editing state is derived from the props, and re-derived whenever the day being edited changes.
  // Keeping the key alongside the draft (rather than an effect) is React's own "adjust state during
  // render" pattern: a new day is a different form, not a mutation of the current one.
  const draftKey = `${selectedEmployee?.id ?? ''}|${mode}|${mode === 'DATE' ? dateISO : dayOfWeek}`;
  const [draft, setDraft] = useState(baseline);
  const [key, setKey] = useState(draftKey);
  if (key !== draftKey) {
    setKey(draftKey);
    setDraft(baseline);
  }

  const totalMinutes = draft.shifts.reduce(
    (total, shift) => total + Math.max(0, minutesOf(shift.endsAt) - minutesOf(shift.startsAt)),
    0,
  );
  const dayHours = businessHours.filter((row) => row.dayOfWeek === dayOfWeek);
  const weekdayLabel = `${copy.dashboard.hoursScreen.weekdayPrefix} ${copy.dashboard.hoursScreen.weekdays[dayOfWeek]}`.trim();

  function updateShift(index: number, patch: Partial<Shift>) {
    setDraft((current) => ({
      ...current,
      shifts: current.shifts.map((shift, position) => (position === index ? { ...shift, ...patch } : shift)),
    }));
  }

  function save() {
    if (!selectedEmployee || !isEditable) return;
    setError(null);

    // The server refuses this too; catching it here is what makes the reason readable, in the
    // reader's language, instead of a round trip that comes back "correct the highlighted fields"
    // over a form with no highlighted field.
    if (!draft.isDayOff && draft.shifts.length === 0) {
      setError(copy.dashboard.hoursScreen.noShiftsError);
      return;
    }

    startTransition(async () => {
      const result = await setDaySchedule({
        employeeId: selectedEmployee.id,
        scope: mode,
        ...(mode === 'DATE' ? { dateISO } : { dayOfWeek }),
        isDayOff: draft.isDayOff,
        shifts: draft.isDayOff ? [] : draft.shifts,
      });

      if (!result.ok) {
        // A VALIDATION failure carries the useful sentence on the field, not on `message`, which is
        // the generic "correct the highlighted fields" — and this form highlights nothing.
        const fieldError = result.error.fields ? Object.values(result.error.fields)[0] : undefined;
        setError(fieldError || result.error.message || copy.dashboard.hoursScreen.saveError);
        return;
      }

      setSavedAt(Date.now());
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* The boundary first, then the shifts inside it — a shift outside opening hours is flagged
          below, and this is the control that answers the flag. */}
      <BusinessHoursEditor businessId={businessId} businessHours={businessHours} />

      <div className={`${surfaceCard} gap-4 p-4 sm:p-5`}>
        <DashboardSectionHeader
          icon={CalendarClock}
          title={copy.dashboard.hoursScreen.title}
          description={copy.dashboard.hoursScreen.description}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                <Users className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
                {copy.dashboard.hoursScreen.employeeLabel}
              </span>
              {employees.map((employee) => (
                <button
                  key={employee.id}
                  type="button"
                  // Which employee is being edited lives in the URL: it decides which rules are
                  // fetched, so it is a server question — unlike the date, which only filters rules
                  // already in hand.
                  onClick={() => router.push(`/businesses/manage/hours?employee=${employee.id}`, { scroll: false })}
                  aria-pressed={employee.id === selectedEmployee?.id}
                  className={`${actionButton} ${actionButtonChip} ${
                    employee.id === selectedEmployee?.id ? actionButtonSelectedOnLight : ''
                  }`}
                >
                  <StaffAvatar employee={employee} />
                  {employee.fullName || employee.positionTitle}
                </button>
              ))}
            </div>
          }
        />
      </div>

      {selectedEmployee ? (
        <>
          <div className={`${surfaceCard} gap-4 p-4 sm:p-5`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-bold text-[var(--brand)]">
                {copy.dashboard.hoursScreen.actionsFor.replace('{name}', selectedEmployee.fullName)}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'DATE' ? 'WEEKLY' : 'DATE')}
                  className={`${actionButton} ${actionButtonLarge}`}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {mode === 'DATE'
                    ? copy.dashboard.hoursScreen.switchToWeekly
                    : copy.dashboard.hoursScreen.switchToDate}
                </button>
                {isEditable ? (
                  <button
                    type="button"
                    onClick={save}
                    disabled={isPending}
                    className={`${actionButton} ${actionButtonLarge} shadow-lg`}
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {isPending
                      ? copy.dashboard.hoursScreen.saving
                      : mode === 'DATE'
                        ? copy.dashboard.hoursScreen.saveDate
                        : copy.dashboard.hoursScreen.saveWeekly.replace('{day}', weekdayLabel)}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={dateISO}
                  onChange={(event) => event.target.value && setDateISO(event.target.value)}
                  aria-label={copy.dashboard.hoursScreen.switchToDate}
                  className={`${surfaceField} ${fieldPadding} w-auto cursor-pointer py-2 font-semibold`}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!isEditable}
                  onClick={() => setDraft((current) => ({ ...current, isDayOff: false }))}
                  aria-pressed={!draft.isDayOff}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed ${
                    draft.isDayOff
                      ? 'bg-slate-100 text-[var(--muted)] hover:bg-slate-200'
                      : 'bg-emerald-500 text-white'
                  }`}
                >
                  <Sun className="h-4 w-4" aria-hidden="true" />
                  {copy.dashboard.hoursScreen.working}
                </button>
                <button
                  type="button"
                  disabled={!isEditable}
                  onClick={() => setDraft((current) => ({ ...current, isDayOff: true }))}
                  aria-pressed={draft.isDayOff}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed ${
                    draft.isDayOff
                      ? 'bg-[var(--brand-dark)] text-white'
                      : 'bg-slate-100 text-[var(--muted)] hover:bg-slate-200'
                  }`}
                >
                  <Moon className="h-4 w-4" aria-hidden="true" />
                  {copy.dashboard.hoursScreen.dayOff}
                </button>
              </div>
            </div>

            <p className="text-xs leading-5 text-[var(--muted)]">
              {mode === 'DATE'
                ? copy.dashboard.hoursScreen.dateNotice
                : copy.dashboard.hoursScreen.weeklyNotice.replace('{day}', weekdayLabel)}
              {dayHours.length > 0
                ? ` ${copy.dashboard.hoursScreen.businessHoursRange
                    .replace('{day}', weekdayLabel)
                    .replace(
                      '{range}',
                      dayHours.map((row) => `${row.opensAt} - ${row.closesAt}`).join(', '),
                    )}`
                : null}
            </p>

            {isEditable ? null : (
              <p className="rounded-2xl bg-[var(--soft-violet)] px-4 py-3 text-sm font-semibold text-[var(--brand-deep)]">
                {copy.dashboard.hoursScreen.colleagueNotice.replace('{name}', selectedEmployee.fullName)}
              </p>
            )}
          </div>

          <div className={`${surfaceCard} gap-4 p-4 sm:p-5`}>
            {draft.isDayOff ? (
              <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-[var(--muted)]">
                {copy.dashboard.hoursScreen.dayOffNotice}
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-3 rounded-2xl bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                      <Zap className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                      {copy.dashboard.hoursScreen.presets}
                    </span>
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        disabled={!isEditable}
                        onClick={() => setDraft({ isDayOff: false, shifts: preset.shifts })}
                        className="cursor-pointer rounded-2xl border border-[var(--line)] bg-white px-3 py-1.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {presetLabel(preset, copy.dashboard.hoursScreen)}
                      </button>
                    ))}
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--soft-violet)] px-3 py-1 text-sm font-bold text-[var(--brand-deep)]">
                    {copy.dashboard.hoursScreen.totalHours.replace('{hours}', formatHours(totalMinutes))}
                  </span>
                </div>

                {draft.shifts.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-[var(--muted)]">
                    {copy.dashboard.hoursScreen.emptyShifts}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {draft.shifts.map((shift, index) => (
                      <li
                        key={index}
                        className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--line)] p-3"
                      >
                        <span className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--brand)] text-xs font-extrabold text-white">
                            {index + 1}
                          </span>
                          {copy.dashboard.hoursScreen.shift}
                        </span>

                        <label className="flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
                          {copy.dashboard.hoursScreen.from}
                          <input
                            type="time"
                            value={shift.startsAt}
                            disabled={!isEditable}
                            onChange={(event) => updateShift(index, { startsAt: event.target.value })}
                            className={`${surfaceField} ${fieldPadding} w-auto py-2 font-bold text-[var(--foreground)]`}
                          />
                        </label>
                        <label className="flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
                          {copy.dashboard.hoursScreen.to}
                          <input
                            type="time"
                            value={shift.endsAt}
                            disabled={!isEditable}
                            onChange={(event) => updateShift(index, { endsAt: event.target.value })}
                            className={`${surfaceField} ${fieldPadding} w-auto py-2 font-bold text-[var(--foreground)]`}
                          />
                        </label>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-[var(--muted)]">
                          {copy.dashboard.hoursScreen.shiftHours.replace(
                            '{hours}',
                            formatHours(Math.max(0, minutesOf(shift.endsAt) - minutesOf(shift.startsAt))),
                          )}
                        </span>

                        {dayHours.length > 0 && isOutsideBusinessHours(shift, dayHours) ? (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
                            {copy.dashboard.hoursScreen.outsideBusinessHours}
                          </span>
                        ) : null}

                        {isEditable ? (
                          <button
                            type="button"
                            aria-label={`${copy.dashboard.hoursScreen.removeShift} ${index + 1}`}
                            onClick={() =>
                              setDraft((current) => {
                                const shifts = current.shifts.filter((_, position) => position !== index);
                                // Removing the last shift leaves a day with no hours, which is a day
                                // off — so the screen says so instead of sitting in a state it would
                                // then refuse to save.
                                return { isDayOff: shifts.length === 0, shifts };
                              })
                            }
                            className="ms-auto cursor-pointer rounded-full p-2 text-rose-500 transition-colors hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}

                {isEditable ? (
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        shifts: [...current.shifts, nextShift(current.shifts)],
                      }))
                    }
                    className="w-fit cursor-pointer self-end rounded-2xl border border-dashed border-[var(--brand)] px-4 py-2 text-sm font-bold text-[var(--brand)] transition-colors hover:bg-[var(--soft-violet)]"
                  >
                    <Plus className="me-1 inline h-4 w-4" aria-hidden="true" />
                    {mode === 'DATE'
                      ? copy.dashboard.hoursScreen.addShiftDate
                      : copy.dashboard.hoursScreen.addShiftWeekly}
                  </button>
                ) : null}
              </>
            )}

            {error ? <ErrorNotice description={error} /> : null}
            {savedAt && !error ? (
              <p role="status" className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {copy.dashboard.hoursScreen.saved}
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * What the selected day currently says, read off the employee's rules.
 *
 * A date with no exception of its own falls back to the weekly pattern — which is exactly what the
 * availability engine does, so the form opens showing what would really happen rather than an empty
 * day. "No windows at all" reads as a day off, because that is what it means to the engine.
 */
function readDay({
  rules,
  mode,
  dateISO,
  dayOfWeek,
  timezone,
}: {
  rules: AvailabilityRule[];
  mode: Mode;
  dateISO: string;
  dayOfWeek: number;
  timezone: string;
}): { isDayOff: boolean; shifts: Shift[] } {
  const weekly = rules
    .filter((rule) => rule.kind === 'WEEKLY_WINDOW' && rule.dayOfWeek === dayOfWeek)
    .map(toShift);

  if (mode === 'WEEKLY') {
    return weekly.length > 0 ? { isDayOff: false, shifts: sortShifts(weekly) } : EMPTY_DAY;
  }

  const covers = (rule: AvailabilityRule) => coversDate(rule, dateISO, timezone);
  const blocked = rules.some((rule) => (rule.kind === 'BLOCK' || rule.kind === 'VACATION') && covers(rule));
  const exceptions = rules.filter((rule) => rule.kind === 'EXCEPTION' && covers(rule)).map(toShift);

  if (blocked) return { isDayOff: true, shifts: [] };
  if (exceptions.length > 0) return { isDayOff: false, shifts: sortShifts(exceptions) };
  if (weekly.length > 0) return { isDayOff: false, shifts: sortShifts(weekly) };
  return EMPTY_DAY;
}

/** Whether a rule's effective range covers the given local date in the business's zone. */
function coversDate(rule: AvailabilityRule, dateISO: string, timezone: string): boolean {
  if (!rule.effectiveFrom || !rule.effectiveTo) return false;

  const from = toDateISO(new Date(rule.effectiveFrom), timezone);
  // The upper bound is exclusive — midnight of the next day — so a whole-day range would otherwise
  // read as covering the day after it too.
  const to = toDateISO(new Date(Date.parse(rule.effectiveTo) - 1), timezone);
  return from <= dateISO && dateISO <= to;
}

function toShift(rule: AvailabilityRule): Shift {
  return { startsAt: rule.startsAt ?? '09:00', endsAt: rule.endsAt ?? '17:00' };
}

function sortShifts(shifts: Shift[]): Shift[] {
  return [...shifts].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** A new row starts where the last one ended, which is what "add another shift" usually means. */
function nextShift(shifts: Shift[]): Shift {
  const last = shifts[shifts.length - 1];
  if (!last) return { startsAt: '09:00', endsAt: '17:00' };

  const start = Math.min(minutesOf(last.endsAt) + 60, 22 * 60);
  return { startsAt: toHHmm(start), endsAt: toHHmm(Math.min(start + 240, 23 * 60 + 59)) };
}

function isOutsideBusinessHours(shift: Shift, dayHours: BusinessHourRow[]): boolean {
  return !dayHours.some(
    (row) => minutesOf(shift.startsAt) >= minutesOf(row.opensAt) && minutesOf(shift.endsAt) <= minutesOf(row.closesAt),
  );
}

function minutesOf(timeHHmm: string): number {
  const [hours, minutes] = timeHHmm.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function toHHmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Whole hours read as "10", a half as "9.5" — never "9.50" or "10.0". */
function formatHours(minutes: number): string {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

/** 0 = Sunday, matching `business_hours.day_of_week`. Pure calendar arithmetic — no zone involved. */
function weekdayOf(dateISO: string): number {
  const [year, month, day] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function presetLabel(
  preset: { id: string; shifts: Shift[] },
  copy: { presetMorning: string; presetEvening: string; presetSplit: string },
): string {
  const range = `${preset.shifts[0].startsAt} - ${preset.shifts[0].endsAt}`;

  if (preset.id === 'morning') return `${copy.presetMorning} (${range})`;
  if (preset.id === 'evening') return `${copy.presetEvening} (${range})`;
  if (preset.id === 'split') return copy.presetSplit;
  return range;
}

function StaffAvatar({ employee }: { employee: DashboardEmployee }) {
  if (employee.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- Storage host isn't in next.config's remotePatterns (§8)
    return <img src={employee.avatarUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />;
  }

  return <UserRound className="h-4 w-4 shrink-0" aria-hidden="true" />;
}
