import { z } from 'zod';

import { uuid } from '@/lib/validation/common';

/**
 * Admin console payloads (TECHNICAL_DESIGN.md §5.5, §4.5).
 *
 * Nothing here can grant admin. §6.8 rules 1–2 make `account_type = 'ADMIN'` reachable only by
 * an operator running SQL: no route or action writes it, `0010`'s
 * `protect_profile_privileged_columns()` trigger rejects the column outright for a self-service
 * caller, and `suspendUser` below only ever touches `status`.
 */

export const categoryInput = z.object({
  id: uuid.optional(),
  name: z
    .string()
    .trim()
    .min(2, 'Category name must be 2–60 characters')
    .max(60, 'Category name must be 2–60 characters'),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens only'),
});
export type CategoryInput = z.infer<typeof categoryInput>;

/** `suspendUser` / `suspendBusiness` (§5.5) — both write `status` and an `audit_log` row. */
export const suspendInput = z.object({
  id: uuid,
  suspended: z.boolean(),
});
export type SuspendInput = z.infer<typeof suspendInput>;

/**
 * `/admin/users` query params. Filtering used to happen entirely in the browser over the whole
 * roster (`filterUsers()`, now deleted) — every user's phone number rode along in the initial
 * payload regardless of what filter was applied. These params drive `listUsers()` server-side
 * instead, so what is shipped to the browser is bounded by the current filter, not the platform's
 * entire user count.
 */
export const adminUsersQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
  role: z.enum(['CLIENT', 'BUSINESS', 'ADMIN']).optional(),
});
export type AdminUsersQuery = z.infer<typeof adminUsersQuery>;
