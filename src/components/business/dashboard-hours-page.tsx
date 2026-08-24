'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarClock, Moon, Plus, Save, Sun, Trash2, UserRound, Users, Zap } from 'lucide-react';

import { ErrorNotice } from '@/components/common/error-dialog';
import { EmployeeWeeklyHoursEditor } from '@/components/business/employee-weekly-hours-editor';
import { DashboardSectionHeader } from '@/components/business/dashboard-section-header';
import { actionButton, actionButtonChip, actionButtonLarge, actionButtonSelectedOnLight } from '@/components/common/button-styles';
import { surfaceCard } from '@/components/common/card-styles';
import { fieldPadding, surfaceField } from '@/components/common/field-styles';
import { useLanguage } from '@/lib/i18n/language-provider';
import { toDateISO } from '@/lib/time';
import { setDaySchedule } from '@/server/actions/availability';
import type { AvailabilityRule, DashboardEmployee, DashboardService } from '@/types/domain';

type Shift = { startsAt: string; endsAt: string; serviceId: string | null };

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
  { id: 'full', shifts: [{ startsAt: '09:00', endsAt: '19:00', serviceId: null }] },
  { id: 'morning', shifts: [{ startsAt: '08:30', endsAt: '14:00', serviceId: null }] },
  { id: 'evening', shifts: [{ startsAt: '14:00', endsAt: '20:30', serviceId: null }] },
  {
    id: 'split',
    shifts: [
      { startsAt: '08:30', endsAt: '14:00', serviceId: null },
      { startsAt: '16:00', endsAt: '20:30', serviceId: null },
    ],
  },
];

/**
 * `/businesses/manage/hours` — one staff member's working windows: a recurring weekly pattern, and
 * per-date overrides on top of it.
 *
 * `EmployeeWeeklyHoursEditor` sets the default (§12.67, replacing the earlier business-hours-shaped
 * screen entirely — this page no longer edits `business_hours` at all). `DateScheduleEditor` below
 * it writes `EXCEPTION` rows for one date, which *replace* whatever the weekly pattern says for that
 * weekday (§6.1 step 5) — reading it opens pre-filled with the weekly pattern already in effect, so
 * "today, but finishing at 15:00" is two clicks rather than a blank form. A day off is a whole-day
 * `BLOCK`, because the schema's CHECK requires an EXCEPTION to carry times: "no windows at all" is
 * not expressible as one.
 *
 * §12.x — `business_hours` no longer plays any part here, or in `get_available_slots()`
 * (`0038_availability_drop_business_hours.sql`). It used to be the outer boundary every window was
 * intersected against, but its editor was removed on 2026-08-21 with no replacement, which left the
 * engine gated by rows nobody could see or clear — this screen's own "shift exceeds opening hours"
 * warning was reporting a real constraint with no fix available anywhere in the app. The employee's
 * own weekly pattern and date overrides are now the sole source of truth for what is bookable. A day
 * off never cancels anything (§6.9) — the notice says so, because the alternative reading ("marking
 * a day off frees my bookings") is the dangerous one.
 *
 * Working hours belong to the person who works them: both `setWeeklyAvailability` and
 * `setDaySchedule` refuse any `employeeId` but the caller's own and RLS re-checks it, so a
 * colleague's schedule renders read-only rather than offering controls that would be rejected.
 */
export function DashboardHoursPage({
  employees,
  selectedEmployee,
  rules,
  services,
  timezone,
  currentEmployeeId,
}: {
  employees: DashboardEmployee[];
  selectedEmployee: DashboardEmployee | null;
  /** Every rule of the selected employee — a date change filters these, never refetches. */
  rules: AvailabilityRule[];
  /** The selected employee's own ACTIVE services — what a shift can optionally be restricted to (§12.68). */
  services: DashboardService[];
  timezone: string;
  currentEmployeeId: string | null;
}) {
  const { copy } = useLanguage();
  const router = useRouter();

  const todayISO = useMemo(() => toDateISO(new Date(), timezone), [timezone]);
  const [dateISO, setDateISO] = useState(todayISO);

  const isEditable = selectedEmployee !== null && selectedEmployee.id === currentEmployeeId;

  return (
    <div className="flex flex-col gap-5">
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
          {isEditable ? null : (
            <p className="rounded-2xl bg-[var(--soft-violet)] px-4 py-3 text-sm font-semibold text-[var(--brand-deep)]">
              {copy.dashboard.hoursScreen.colleagueNotice.replace('{name}', selectedEmployee.fullName)}
            </p>
          )}

          <EmployeeWeeklyHoursEditor
            employeeId={selectedEmployee.id}
            isEditable={isEditable}
            rules={rules}
            services={services}
          />

          <DateScheduleEditor
            employeeId={selectedEmployee.id}
            isEditable={isEditable}
            rules={rules}
            services={services}
            timezone={timezone}
            dateISO={dateISO}
            onDateChange={setDateISO}
          />
        </>
      ) : null}
    </div>
  );
}

/**
 * One date's editor — reads the effective schedule for that date (the weekly pattern, unless an
 * exception already overrides it) and saves an `EXCEPTION` (or a whole-day `BLOCK` for a day off).
 */
function DateScheduleEditor({
  employeeId,
  isEditable,
  rules,
  services,
  timezone,
  dateISO,
  onDateChange,
}: {
  employeeId: string;
  isEditable: boolean;
  rules: AvailabilityRule[];
  services: DashboardService[];
  timezone: string;
  dateISO: string;
  onDateChange: (value: string) => void;
}) {
  const { copy } = useLanguage();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dayOfWeek = weekdayOf(dateISO);

  const baseline = useMemo(
    () => readDay({ rules, dateISO, dayOfWeek, timezone }),
    [rules, dateISO, dayOfWeek, timezone],
  );

  // Editing state is derived from the props, and re-derived whenever the date changes. Keeping the
  // key alongside the draft (rather than an effect) is React's own "adjust state during render"
  // pattern: a new date is a different form, not a mutation of the current one.
  const draftKey = `${employeeId}|${dateISO}`;
  const [draft, setDraft] = useState(baseline);
  const [key, setKey] = useState(draftKey);
  if (key !== draftKey) {
    setKey(draftKey);
    setDraft(baseline);
    setError(null);
    setSavedAt(null);
  }

  const totalMinutes = draft.shifts.reduce(
    (total, shift) => total + Math.max(0, minutesOf(shift.endsAt) - minutesOf(shift.startsAt)),
    0,
  );

  function updateShift(index: number, patch: Partial<Shift>) {
    setDraft((current) => ({
      ...current,
      shifts: current.shifts.map((shift, position) => (position === index ? { ...shift, ...patch } : shift)),
    }));
  }

  function save() {
    if (!isEditable) return;
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
        employeeId,
        scope: 'DATE',
        dateISO,
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
    <div role="region" aria-label={copy.dashboard.hoursScreen.switchToDate} className={`${surfaceCard} gap-4 p-4 sm:p-5`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold text-[var(--brand)]">{copy.dashboard.hoursScreen.switchToDate}</p>
        {isEditable ? (
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className={`${actionButton} ${actionButtonLarge} shadow-lg`}
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {isPending ? copy.dashboard.hoursScreen.saving : copy.dashboard.hoursScreen.saveDate}
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <input
          type="date"
          value={dateISO}
          onChange={(event) => event.target.value && onDateChange(event.target.value)}
          aria-label={copy.dashboard.hoursScreen.switchToDate}
          className={`${surfaceField} ${fieldPadding} w-auto cursor-pointer py-2 font-semibold`}
        />

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

      <p className="text-xs leading-5 text-[var(--muted)]">{copy.dashboard.hoursScreen.dateNotice}</p>

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

                  {services.length > 0 ? (
                    <label className="flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
                      {copy.dashboard.hoursScreen.serviceLabel}
                      <select
                        value={shift.serviceId ?? ''}
                        disabled={!isEditable}
                        aria-label={`${copy.dashboard.hoursScreen.serviceLabel} ${index + 1}`}
                        onChange={(event) => updateShift(index, { serviceId: event.target.value || null })}
                        className={`picker-select ${surfaceField} ${fieldPadding} w-auto cursor-pointer py-2 font-semibold`}
                      >
                        <option value="">{copy.dashboard.hoursScreen.anyService}</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-[var(--muted)]">
                    {copy.dashboard.hoursScreen.shiftHours.replace(
                      '{hours}',
                      formatHours(Math.max(0, minutesOf(shift.endsAt) - minutesOf(shift.startsAt))),
                    )}
                  </span>

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
              {copy.dashboard.hoursScreen.addShiftDate}
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
  );
}

/**
 * What the selected date currently says, read off the employee's rules.
 *
 * A date with no exception of its own falls back to the weekly pattern — which is exactly what the
 * availability engine does, so the form opens showing what would really happen rather than an empty
 * day. "No windows at all" reads as a day off, because that is what it means to the engine.
 */
function readDay({
  rules,
  dateISO,
  dayOfWeek,
  timezone,
}: {
  rules: AvailabilityRule[];
  dateISO: string;
  dayOfWeek: number;
  timezone: string;
}): { isDayOff: boolean; shifts: Shift[] } {
  const covers = (rule: AvailabilityRule) => coversDate(rule, dateISO, timezone);
  const blocked = rules.some((rule) => (rule.kind === 'BLOCK' || rule.kind === 'VACATION') && covers(rule));
  const exceptions = rules.filter((rule) => rule.kind === 'EXCEPTION' && covers(rule)).map(toShift);
  const weekly = rules
    .filter((rule) => rule.kind === 'WEEKLY_WINDOW' && rule.dayOfWeek === dayOfWeek)
    .map(toShift);

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
  return { startsAt: rule.startsAt ?? '09:00', endsAt: rule.endsAt ?? '17:00', serviceId: rule.serviceId };
}

function sortShifts(shifts: Shift[]): Shift[] {
  return [...shifts].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** A new row starts where the last one ended, which is what "add another shift" usually means. */
function nextShift(shifts: Shift[]): Shift {
  const last = shifts[shifts.length - 1];
  if (!last) return { startsAt: '09:00', endsAt: '17:00', serviceId: null };

  const start = Math.min(minutesOf(last.endsAt) + 60, 22 * 60);
  return { startsAt: toHHmm(start), endsAt: toHHmm(Math.min(start + 240, 23 * 60 + 59)), serviceId: null };
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

/** 0 = Sunday, matching `employee_availability_rules.day_of_week`. Pure calendar arithmetic — no zone involved. */
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
