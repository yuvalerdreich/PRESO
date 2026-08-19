import { z } from 'zod';

import { optionalText, uuid } from '@/lib/validation/common';

/**
 * Service schema (TECHNICAL_DESIGN.md §9's worked example, reproduced as specified).
 *
 * Services belong to an **employee**, not a business (§3.8) — there is no `businessId` here on
 * purpose. `upsertService` derives the owner from the caller's own `employees` row, and RLS
 * re-checks it, so another employee's service is unreachable even with a forged `id`.
 */
export const serviceInput = z.object({
  id: uuid.optional(),
  name: z
    .string()
    .trim()
    .min(2, 'Service name must be at least 2 characters')
    .max(80, 'Service name must be at most 80 characters'),
  /**
   * `services.description` (0015). The column existed to feed the *public* booking page before
   * any screen could write it — the dashboard's service form is what closes that loop.
   */
  description: optionalText(1000, 'Description is limited to 1000 characters'),
  price: z.coerce.number().min(0, 'Price cannot be negative').max(99_999, 'Price is too high'),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(5, 'Minimum service length is 5 minutes')
    .max(480, 'Maximum service length is 8 hours'),
  bufferMinutes: z.coerce.number().int().min(0).max(120, 'Buffer cannot exceed 2 hours').default(0),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
});
export type ServiceInput = z.infer<typeof serviceInput>;

export const deleteServiceInput = z.object({ id: uuid });
export type DeleteServiceInput = z.infer<typeof deleteServiceInput>;
