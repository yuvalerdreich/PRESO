import { z } from 'zod';

import { MILLISECONDS_PER_DAY, futureIsoDateTime, isoDateTime, uuid } from '@/lib/validation/common';

/**
 * Waitlist payloads (TECHNICAL_DESIGN.md §9.4, §5.4).
 */

const MAX_WAITLIST_RANGE_DAYS = 60;
const MAX_WAITLIST_EMPLOYEE_TARGETS = 20;

export const waitlistEntryInput = z
  .object({
    businessId: uuid,
    /** Omitted means "any service" — `waitlist_entries.service_id` is nullable for exactly this. */
    serviceId: uuid.optional(),
    /**
     * Empty means "any employee in the business". `waitlist_employee_targets` holds no rows in
     * that case rather than one row per employee, so widening the roster later doesn't leave
     * old entries silently targeting a stale subset (§3.10).
     */
    employeeIds: z
      .array(uuid)
      .max(MAX_WAITLIST_EMPLOYEE_TARGETS, 'Choose up to 20 staff members')
      .default([]),
    fromTs: futureIsoDateTime,
    toTs: isoDateTime,
  })
  .refine((entry) => Date.parse(entry.toTs) > Date.parse(entry.fromTs), {
    message: 'Choose an end time after the start time',
    path: ['toTs'],
  })
  .refine(
    (entry) =>
      Date.parse(entry.toTs) - Date.parse(entry.fromTs) <= MAX_WAITLIST_RANGE_DAYS * MILLISECONDS_PER_DAY,
    { message: 'Waiting ranges are limited to 60 days', path: ['toTs'] },
  );
export type WaitlistEntryInput = z.infer<typeof waitlistEntryInput>;

/**
 * `POST /api/waitlist/[id]/claim` (§5.4). `serviceId` is required even though the entry may
 * carry one, because an entry with `service_id IS NULL` matches any service and the claimer has
 * to say which one they are taking (§12.31).
 */
export const claimWaitlistInput = z.object({
  employeeId: uuid,
  serviceId: uuid,
  startsAt: futureIsoDateTime,
});
export type ClaimWaitlistInput = z.infer<typeof claimWaitlistInput>;
