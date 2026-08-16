import { describe, expect, it } from 'vitest';

import {
  addCalendarDays,
  daysBetween,
  endOfLocalDay,
  fromLocalDateTime,
  monthBounds,
  parseTstzRange,
  startOfLocalDay,
  toDateISO,
  toTimeHHmm,
  toTstzRange,
} from '@/lib/time';

const JERUSALEM = 'Asia/Jerusalem';

/**
 * `parseTstzRange` is the only way an appointment's start and end times are ever read —
 * `appointments.slot` is a `tstzrange`, which PostgREST hands back as a raw literal and
 * `database.types.ts` types as `unknown`. A regression here breaks every appointment list at
 * once, silently, so the literal shapes Postgres actually emits are pinned below.
 */
describe('parseTstzRange', () => {
  it('parses the quoted, space-separated form PostgREST returns', () => {
    const parsed = parseTstzRange('["2026-01-01 09:00:00+00","2026-01-01 09:30:00+00")');

    expect(parsed).not.toBeNull();
    expect(parsed!.startsAt.toISOString()).toBe('2026-01-01T09:00:00.000Z');
    expect(parsed!.endsAt.toISOString()).toBe('2026-01-01T09:30:00.000Z');
  });

  it('parses an unquoted ISO form', () => {
    const parsed = parseTstzRange('[2026-01-01T09:00:00+00:00,2026-01-01T09:30:00+00:00)');
    expect(parsed!.startsAt.toISOString()).toBe('2026-01-01T09:00:00.000Z');
  });

  it('preserves a non-UTC offset rather than reinterpreting it', () => {
    // Postgres renders in the session TimeZone; 11:00+02 is the same instant as 09:00Z.
    const parsed = parseTstzRange('["2026-01-01 11:00:00+02","2026-01-01 11:30:00+02")');
    expect(parsed!.startsAt.toISOString()).toBe('2026-01-01T09:00:00.000Z');
  });

  it('returns null for a non-string, which is what `unknown` may actually hold', () => {
    expect(parseTstzRange(null)).toBeNull();
    expect(parseTstzRange(undefined)).toBeNull();
    expect(parseTstzRange({})).toBeNull();
  });

  it('returns null for a malformed literal rather than an Invalid Date', () => {
    expect(parseTstzRange('not a range')).toBeNull();
    expect(parseTstzRange('["nonsense","also nonsense")')).toBeNull();
  });

  it('round-trips through toTstzRange', () => {
    const startsAt = new Date('2026-03-01T07:15:00.000Z');
    const endsAt = new Date('2026-03-01T08:00:00.000Z');

    const parsed = parseTstzRange(toTstzRange(startsAt, endsAt));
    expect(parsed!.startsAt.getTime()).toBe(startsAt.getTime());
    expect(parsed!.endsAt.getTime()).toBe(endsAt.getTime());
  });
});

describe('zone-aware formatting', () => {
  it('reports the date and time as seen in the business zone, not the server zone', () => {
    // 22:30Z on the 1st is already 00:30 on the 2nd in Jerusalem (UTC+2 in winter).
    const instant = new Date('2026-01-01T22:30:00.000Z');

    expect(toDateISO(instant, JERUSALEM)).toBe('2026-01-02');
    expect(toTimeHHmm(instant, JERUSALEM)).toBe('00:30');
    expect(toDateISO(instant, 'UTC')).toBe('2026-01-01');
  });

  it('fromLocalDateTime resolves wall-clock time through the zone, not the server default', () => {
    // Winter: Jerusalem is UTC+2, so 09:00 local is 07:00Z.
    expect(fromLocalDateTime('2026-01-15', '09:00', JERUSALEM).toISOString()).toBe('2026-01-15T07:00:00.000Z');
    // Summer: UTC+3, so the same wall-clock time is a different instant.
    expect(fromLocalDateTime('2026-07-15', '09:00', JERUSALEM).toISOString()).toBe('2026-07-15T06:00:00.000Z');
  });
});

describe('day and month bounds', () => {
  it('brackets one local day', () => {
    expect(startOfLocalDay('2026-01-15', JERUSALEM).toISOString()).toBe('2026-01-14T22:00:00.000Z');
    expect(endOfLocalDay('2026-01-15', JERUSALEM).toISOString()).toBe('2026-01-15T22:00:00.000Z');
  });

  it('spans a DST-transition day by calendar date, not by adding 24 hours (§6.9)', () => {
    // Israel's 2026 spring-forward is on 2026-03-27; that local day is 23 hours long.
    const from = startOfLocalDay('2026-03-27', JERUSALEM);
    const to = endOfLocalDay('2026-03-27', JERUSALEM);

    expect(to.getTime() - from.getTime()).toBe(23 * 3_600_000);
    // The bound still lands exactly on the next local midnight — the point of the exercise.
    expect(toDateISO(to, JERUSALEM)).toBe('2026-03-28');
    expect(toTimeHHmm(to, JERUSALEM)).toBe('00:00');
  });

  it('rolls a month bound over a year boundary', () => {
    const { from, to } = monthBounds('2026-12', JERUSALEM);
    expect(toDateISO(from, JERUSALEM)).toBe('2026-12-01');
    expect(toDateISO(to, JERUSALEM)).toBe('2027-01-01');
  });
});

describe('calendar helpers', () => {
  it('adds days across a month and a year boundary', () => {
    expect(addCalendarDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addCalendarDays('2028-02-28', 1)).toBe('2028-02-29'); // leap year
    expect(addCalendarDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('measures the span the 62- and 14-day horizon caps are checked against', () => {
    expect(daysBetween(new Date('2026-01-01T00:00:00Z'), new Date('2026-03-04T00:00:00Z'))).toBe(62);
  });
});
