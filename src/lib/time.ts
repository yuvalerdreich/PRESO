import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

/**
 * Time helpers (TECHNICAL_DESIGN.md §6.9, §9.4).
 *
 * The rule §6.9 states for the database applies just as much up here: all arithmetic is on
 * absolute instants converted through a named zone, **never** `+ 24 hours` on a local date. A
 * DST-transition day is 23 or 25 hours long and simply yields fewer or more slots.
 *
 * Every business carries its own `businesses.timezone` (§12.3, IANA, default `Asia/Jerusalem`),
 * so "what date is this appointment on" is only answerable relative to that business — which is
 * why the formatters below all take a `timeZone` rather than reading the server's.
 */

/** `businesses.timezone`'s column default, for callers that genuinely have no business in hand. */
export const DEFAULT_TIME_ZONE = 'Asia/Jerusalem';

/**
 * Parse a Postgres `tstzrange` literal.
 *
 * `appointments.slot` is a `tstzrange`, which PostgREST has no JSON representation for — it
 * arrives as the raw literal `["2026-01-01 09:00:00+00","2026-01-01 09:30:00+00")` and
 * `database.types.ts` types it `unknown`. Every read of an appointment's start/end time goes
 * through here.
 */
export function parseTstzRange(value: unknown): { startsAt: Date; endsAt: Date } | null {
  if (typeof value !== 'string') return null;

  // Bounds may be `[`/`(` and `]`/`)`; each endpoint may or may not be quoted.
  const match = /^[[(]\s*"?([^",]+)"?\s*,\s*"?([^",]+)"?\s*[\])]$/.exec(value.trim());
  if (!match) return null;

  const startsAt = parsePostgresTimestamp(match[1]);
  const endsAt = parsePostgresTimestamp(match[2]);
  if (!startsAt || !endsAt) return null;

  return { startsAt, endsAt };
}

/**
 * Postgres renders a `timestamptz` as `2026-01-01 09:00:00+00` — a space instead of `T`, and an
 * **hour-only** UTC offset. `Date` rejects the latter outright (ISO 8601 allows it; V8 does not),
 * so both are normalised before parsing rather than trusting `new Date()` with the raw literal.
 */
function parsePostgresTimestamp(raw: string): Date | null {
  const normalised = raw
    .trim()
    .replace(' ', 'T')
    .replace(/([+-]\d{2})$/, '$1:00');

  const parsed = new Date(normalised);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Build a `tstzrange` literal for the RPCs that take one (`match_waitlist_for_slot`). */
export function toTstzRange(startsAt: Date, endsAt: Date): string {
  return `[${startsAt.toISOString()},${endsAt.toISOString()})`;
}

/** `YYYY-MM-DD` as seen in the business's zone — the key the calendar UI groups slots by. */
export function toDateISO(instant: Date, timeZone: string): string {
  return formatInTimeZone(instant, timeZone, 'yyyy-MM-dd');
}

/** `HH:mm` as seen in the business's zone — what the slot picker renders. */
export function toTimeHHmm(instant: Date, timeZone: string): string {
  return formatInTimeZone(instant, timeZone, 'HH:mm');
}

/**
 * The inverse: a wall-clock date+time in the business's zone → the absolute instant to send to
 * `book_appointment()`. Uses `fromZonedTime` rather than `new Date('…')` because the latter
 * interprets an offset-less string in the *server's* zone, which on Vercel is UTC and on a
 * developer's laptop is not — the single most likely source of an off-by-hours booking bug.
 */
export function fromLocalDateTime(dateISO: string, timeHHmm: string, timeZone: string): Date {
  return fromZonedTime(`${dateISO}T${timeHHmm}:00`, timeZone);
}

/** First instant of the given local date in `timeZone`. */
export function startOfLocalDay(dateISO: string, timeZone: string): Date {
  return fromZonedTime(`${dateISO}T00:00:00`, timeZone);
}

/**
 * First instant of the following local day — an exclusive upper bound for one day's slots.
 *
 * The "add one day" step is deliberately pure calendar arithmetic in UTC before the zone is
 * applied. Adding 24 hours to the *instant* instead would land at 23:00 or 01:00 on a DST
 * boundary and silently include or drop an hour of slots (§6.9).
 */
export function endOfLocalDay(dateISO: string, timeZone: string): Date {
  return fromZonedTime(`${addCalendarDays(dateISO, 1)}T00:00:00`, timeZone);
}

/** `YYYY-MM-DD` + n days, as a calendar operation — no zone and no DST involved. */
export function addCalendarDays(dateISO: string, days: number): string {
  const [year, month, day] = dateISO.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Inclusive-start, exclusive-end bounds for a whole month, given `YYYY-MM`. */
export function monthBounds(monthISO: string, timeZone: string): { from: Date; to: Date } {
  const [year, month] = monthISO.split('-').map(Number);
  const from = fromZonedTime(`${monthISO}-01T00:00:00`, timeZone);
  const nextMonth = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
  const to = fromZonedTime(`${nextMonth}-01T00:00:00`, timeZone);
  return { from, to };
}

/** Whole days between two instants — used for §5.3's 62-day and §6.6's 14-day horizon caps. */
export function daysBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 86_400_000;
}
