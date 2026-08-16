import { z } from 'zod';

import { futureIsoDateTime, uuid } from '@/lib/validation/common';

/**
 * Booking payloads (TECHNICAL_DESIGN.md §9.4, §5.4).
 *
 * Note what is *not* validated here: that `startsAt` is a currently-bookable slot. That is a
 * three-way question about hours, rules and existing appointments which only
 * `get_available_slots()` can answer, and `book_appointment()` re-checks it inside the same
 * transaction as the insert (§6.2). Validating it here as well would be a race, not a
 * safeguard — the schema's job is to reject payloads that are malformed, and the RPC's job is
 * to reject payloads that are merely stale.
 */

export const createAppointmentInput = z.object({
  employeeId: uuid,
  serviceId: uuid,
  startsAt: futureIsoDateTime,
  /**
   * §12.5 — staff booking on behalf of a client. Sent by business staff only; a non-staff
   * caller that sends it gets a `403` (§5.4), which is an authorisation decision the route
   * handler makes, not something a schema can see.
   */
  clientProfileId: uuid.optional(),
});
export type CreateAppointmentInput = z.infer<typeof createAppointmentInput>;

/**
 * `PATCH /api/appointments/[id]` (§5.4). A discriminated union so `reschedule` can require
 * `startsAt` while the other three forbid it, rather than a flat object with an optional field
 * that `cancel` would silently accept and ignore.
 */
export const patchAppointmentInput = z.discriminatedUnion('action', [
  z.object({ action: z.literal('cancel') }),
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('reject'), reason: z.string().trim().max(500).optional() }),
  z.object({ action: z.literal('reschedule'), startsAt: futureIsoDateTime }),
]);
export type PatchAppointmentInput = z.infer<typeof patchAppointmentInput>;
