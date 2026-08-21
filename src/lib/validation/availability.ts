import { z } from 'zod';

import { dayOfWeek, isoDateTime, timeHHmm, uuid } from '@/lib/validation/common';

/**
 * Availability rules (TECHNICAL_DESIGN.md §9.3).
 *
 * Modelled as a **discriminated union on `kind`** because `employee_availability_rules` carries
 * a kind-dependent `CHECK` (§3.7): a `WEEKLY_WINDOW` needs `day_of_week` + times and no range, a
 * `VACATION` needs a range and no times, and so on. A single flat object with four optional
 * columns would parse payloads the database then rejects with a bare `23514`, which surfaces to
 * the user as a generic 400 with no field attached — the union puts the error on the field.
 */

const ruleId = z.object({ id: uuid.optional(), employeeId: uuid });

const effectiveRange = {
  effectiveFrom: isoDateTime,
  effectiveTo: isoDateTime,
};

const rangeIsOrdered = <T extends { effectiveFrom: string; effectiveTo: string }>(value: T) =>
  Date.parse(value.effectiveTo) > Date.parse(value.effectiveFrom);

export const availabilityRuleInput = z.discriminatedUnion('kind', [
  /** The recurring working window. Everything bookable ultimately derives from these (§6.1). */
  ruleId
    .extend({
      kind: z.literal('WEEKLY_WINDOW'),
      dayOfWeek,
      startsAt: timeHHmm,
      endsAt: timeHHmm,
      /** §12.68 — optional; null offers every service, set offers only that one. */
      serviceId: uuid.nullish(),
    })
    .refine((rule) => rule.endsAt > rule.startsAt, {
      message: 'Choose a day and a time range',
      path: ['endsAt'],
    }),

  /** A one-off replacement window on specific dates — overrides the weekly pattern. */
  ruleId
    .extend({
      kind: z.literal('EXCEPTION'),
      startsAt: timeHHmm,
      endsAt: timeHHmm,
      serviceId: uuid.nullish(),
      ...effectiveRange,
    })
    .refine((rule) => rule.endsAt > rule.startsAt, {
      message: 'Choose the dates this exception applies to',
      path: ['endsAt'],
    })
    .refine(rangeIsOrdered, { message: 'End must be after start', path: ['effectiveTo'] }),

  /** Whole-range unavailability. Neither carries times — the range is the whole rule. */
  ruleId
    .extend({ kind: z.literal('VACATION'), ...effectiveRange })
    .refine(rangeIsOrdered, { message: 'End must be after start', path: ['effectiveTo'] }),

  ruleId
    .extend({ kind: z.literal('BLOCK'), ...effectiveRange })
    .refine(rangeIsOrdered, { message: 'End must be after start', path: ['effectiveTo'] }),
]);
export type AvailabilityRuleInput = z.infer<typeof availabilityRuleInput>;

export const deleteAvailabilityRuleInput = z.object({ id: uuid });
export type DeleteAvailabilityRuleInput = z.infer<typeof deleteAvailabilityRuleInput>;

/**
 * `setDaySchedule` — one day's shifts as the schedule screen edits them (§12.50).
 *
 * The per-rule schema above is the general shape; this is the *screen's* shape, and the two differ
 * on purpose. A person editing a day thinks "these are my shifts on that day", not "insert an
 * EXCEPTION row, delete this other one" — so the payload is the finished state of one day, and the
 * action works out which rows to write. `scope` is which kind of day: one calendar date
 * (`EXCEPTION` rows, plus a whole-day `BLOCK` when it is a day off) or every such weekday from now
 * on (`WEEKLY_WINDOW` rows).
 *
 * No timezone here: the action reads it from the employee's own business. A client-supplied zone
 * would let a forged payload write windows into the wrong day.
 */
const shift = z
  .object({
    startsAt: timeHHmm,
    endsAt: timeHHmm,
    /**
     * §12.68 — optional. Null (the default) offers this shift for every one of the employee's
     * services, exactly as before this field existed; set, the shift offers only that one service.
     */
    serviceId: uuid.nullish(),
  })
  .refine((value) => value.endsAt > value.startsAt, {
    message: 'A shift must end after it starts',
    path: ['endsAt'],
  });

/**
 * `setWeeklyAvailability` (§12.67) — a replace-all payload for one employee's `WEEKLY_WINDOW` rows,
 * the same shape `setOperatingHoursInput` uses for `business_hours`. Overlap is server-only for the
 * same reason: no single-row `CHECK` can express a cross-row constraint, and split shifts are legal
 * and intended (an employee working 09:00–13:00 and 16:00–20:00 on the same weekday).
 */
export const weeklyRuleRow = z
  .object({
    dayOfWeek,
    startsAt: timeHHmm,
    endsAt: timeHHmm,
    /** §12.68 — same meaning as `shift.serviceId` below: null offers every service, set offers one. */
    serviceId: uuid.nullish(),
  })
  .refine((row) => row.endsAt > row.startsAt, {
    message: 'Closing time must be after opening time',
    path: ['endsAt'],
  });
export type WeeklyRuleRow = z.infer<typeof weeklyRuleRow>;

export const setWeeklyAvailabilityInput = z
  .object({
    employeeId: uuid,
    rows: z.array(weeklyRuleRow).max(21, 'That is more windows than a week can hold'),
  })
  .refine(
    ({ rows }) => {
      for (const day of new Set(rows.map((row) => row.dayOfWeek))) {
        const windows = rows
          .filter((row) => row.dayOfWeek === day)
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

        for (let i = 1; i < windows.length; i += 1) {
          if (windows[i].startsAt < windows[i - 1].endsAt) return false;
        }
      }
      return true;
    },
    { message: 'Two windows on the same day overlap', path: ['rows'] },
  );
export type SetWeeklyAvailabilityInput = z.infer<typeof setWeeklyAvailabilityInput>;

export const dayScheduleInput = z
  .object({
    employeeId: uuid,
    scope: z.enum(['DATE', 'WEEKLY']),
    /** `YYYY-MM-DD`, required when `scope` is DATE — the local date in the business's zone. */
    dateISO: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a date')
      .optional(),
    /** 0 = Sunday, required when `scope` is WEEKLY. */
    dayOfWeek: dayOfWeek.optional(),
    /** A day off clears the day's windows; for a date it also writes the whole-day BLOCK. */
    isDayOff: z.boolean().default(false),
    /**
     * Empty is only valid together with `isDayOff` (below): a day with no windows offers nothing,
     * so "working" over an empty list is a claim the availability engine would contradict.
     */
    shifts: z.array(shift).max(6, 'Up to 6 shifts a day'),
  })
  .refine((value) => value.scope !== 'DATE' || Boolean(value.dateISO), {
    message: 'Choose a date',
    path: ['dateISO'],
  })
  .refine((value) => value.scope !== 'WEEKLY' || value.dayOfWeek !== undefined, {
    message: 'Choose a day of the week',
    path: ['dayOfWeek'],
  })
  // Removing every shift is a legitimate save — it is how a day's hours come off — but it has to be
  // saved as what it is. A day with no windows is a day off to `get_available_slots()` whatever the
  // form calls it, so the payload has to agree rather than storing a working day that offers nothing.
  .refine((value) => value.isDayOff || value.shifts.length > 0, {
    message: 'A working day needs at least one shift — add one, or mark the day as a day off',
    path: ['shifts'],
  })
  // Overlapping shifts are not rejected by any CHECK — the engine would just union them — but they
  // are always a mistake in a form where each row is meant to be a separate stretch of work.
  .refine(
    (value) => {
      const sorted = [...value.shifts].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      return sorted.every((current, index) => index === 0 || sorted[index - 1].endsAt <= current.startsAt);
    },
    { message: 'Shifts on one day cannot overlap', path: ['shifts'] },
  );
export type DayScheduleInput = z.infer<typeof dayScheduleInput>;
