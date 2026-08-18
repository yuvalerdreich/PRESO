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
