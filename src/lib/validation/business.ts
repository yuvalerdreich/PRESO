import { z } from 'zod';

import { dayOfWeek, optionalText, phone, timeHHmm, timezone, uuid } from '@/lib/validation/common';
import { serviceInput } from '@/lib/validation/service';

/**
 * Business details and operating hours (TECHNICAL_DESIGN.md §9.2, §9.3). Every bound below
 * mirrors a `CHECK` in `0003_tables.sql`.
 */

const businessFields = {
  name: z
    .string()
    .trim()
    .min(2, 'Business name must be 2–80 characters')
    .max(80, 'Business name must be 2–80 characters'),
  description: optionalText(1000, 'Description is limited to 1000 characters'),
  // Not `uuid` from common.ts: this field needs §9.2's own message, and `.describe()` sets
  // metadata rather than the validation message.
  categoryId: z.uuid('Choose a category'),
  address: z
    .string()
    .trim()
    .min(4, 'Enter the business address')
    .max(200, 'Enter the business address'),
  area: z.string().trim().min(2, 'Enter the area you operate in').max(60, 'Enter the area you operate in'),
  phone,
  timezone: timezone.default('Asia/Jerusalem'),
  approvalPolicy: z.enum(['AUTO', 'MANUAL']).default('AUTO'),
  /** §12.2 — the typed replacement for the previously untyped cancellation policy. */
  cancellationWindowHours: z.coerce
    .number()
    .int()
    .min(0, 'Cancellation notice must be between 0 and 168 hours')
    .max(168, 'Cancellation notice must be between 0 and 168 hours')
    .default(24),
  /**
   * §12.44 — the free-text half of the policy step. Untyped on purpose, unlike
   * `cancellationWindowHours` above: no code branches on it, so there is nothing to type.
   */
  paymentNotes: optionalText(1000, 'Payment notes are limited to 1000 characters'),
  /** §12.53 — the same class of operational prose as `paymentNotes`, about booking and arriving. */
  bookingNotes: optionalText(1000, 'Booking notes are limited to 1000 characters'),
  /**
   * §12.53 — the business photo, stored as `photo_paths[1]`.
   *
   * Deliberately loose: `resolvePhotoUrl()` accepts an absolute URL *or* a Storage object path,
   * because no Storage bucket exists yet and both have to keep working when one does. Rejecting
   * anything that is neither is the point — a half-typed address saved silently renders as a
   * broken image on the public booking page, where the business never looks.
   */
  photoUrl: z
    .union([
      z
        .string()
        .trim()
        .max(500, 'That image link is too long')
        .refine((value) => /^https?:\/\/\S+$/i.test(value) || /^[\w.-]+(\/[\w.-]+)+$/.test(value), {
          message: 'Enter a full image link (https://…) or a stored file path',
        }),
      z.literal(''),
    ])
    .optional(),
};

/**
 * `createBusiness` (§5.5). `positionTitle` is the creator's own `employees` row, inserted in the
 * same transaction — §6.8 rule 3 means a business is never persisted with zero employees, so
 * the two are one payload rather than two sequential forms.
 *
 * `services` is optional and belongs to that same first employee, never to the business (§3.8).
 * It rides along because §6.8's "an employee needs ≥1 ACTIVE service to be bookable" otherwise
 * leaves a brand-new business unbookable until a second, separate form is filled in — the
 * onboarding wizard collects both, so the payload carries both. An empty array is legal: the
 * business exists, it simply isn't bookable yet, which is the rule working as designed.
 */
export const createBusinessInput = z.object({
  ...businessFields,
  positionTitle: z.string().trim().min(2).max(60).default('Owner'),
  services: z
    .array(serviceInput.omit({ id: true }))
    .max(20, 'Add up to 20 services here; the rest can be added from the dashboard')
    .default([]),
});
export type CreateBusinessInput = z.infer<typeof createBusinessInput>;

/** `updateBusinessDetails` (§5.5). Any ACTIVE employee may send this, not only the founder (§12.1). */
export const businessDetailsInput = z.object({
  businessId: uuid,
  ...businessFields,
});
export type BusinessDetailsInput = z.infer<typeof businessDetailsInput>;

/** `selectBusinessForManagement` (§12.64) — which business "ניהול העסק" was pressed for. */
export const selectBusinessInput = z.object({ businessId: uuid });
export type SelectBusinessInput = z.infer<typeof selectBusinessInput>;

export const hourRow = z
  .object({
    dayOfWeek,
    opensAt: timeHHmm,
    closesAt: timeHHmm,
  })
  .refine((row) => row.closesAt > row.opensAt, {
    message: 'Closing time must be after opening time',
    path: ['closesAt'],
  });
export type HourRow = z.infer<typeof hourRow>;

/**
 * `setOperatingHours` (§5.5) — a replace-all payload, not a per-row edit.
 *
 * The overlap rule is **server-only** by design (§9.3): it is a cross-row constraint, so no
 * single-row `CHECK` can express it and the database will happily accept two overlapping
 * windows on one day. Split shifts are legal and intended (§12.19 — 09:00–13:00 plus
 * 16:00–20:00), which is exactly why there is no unique index on `(business_id, day_of_week)`
 * to lean on; overlap is the only thing being rejected here, not multiplicity.
 */
export const setOperatingHoursInput = z
  .object({
    businessId: uuid,
    rows: z.array(hourRow).max(21, 'That is more windows than a week can hold'),
  })
  .refine(
    ({ rows }) => {
      for (const day of new Set(rows.map((row) => row.dayOfWeek))) {
        const windows = rows
          .filter((row) => row.dayOfWeek === day)
          .sort((a, b) => a.opensAt.localeCompare(b.opensAt));

        for (let i = 1; i < windows.length; i += 1) {
          if (windows[i].opensAt < windows[i - 1].closesAt) return false;
        }
      }
      return true;
    },
    { message: 'Two windows on the same day overlap', path: ['rows'] },
  );
export type SetOperatingHoursInput = z.infer<typeof setOperatingHoursInput>;

/** `sendJoinRequest` / `decideJoinRequest` / roster management (§5.5, Employee module). */
export const sendJoinRequestInput = z.object({ businessId: uuid });
export type SendJoinRequestInput = z.infer<typeof sendJoinRequestInput>;

export const decideJoinRequestInput = z.object({
  id: uuid,
  decision: z.enum(['APPROVED', 'REJECTED'], { message: 'Choose approve or reject' }),
  /** Only meaningful on approval — the position the new employee is being given. */
  positionTitle: z.string().trim().min(2).max(60).default('Staff'),
});
export type DecideJoinRequestInput = z.infer<typeof decideJoinRequestInput>;

export const employeeStatusInput = z.object({
  employeeId: uuid,
  status: z.enum(['ACTIVE', 'INACTIVE']),
});
export type EmployeeStatusInput = z.infer<typeof employeeStatusInput>;

export const removeEmployeeInput = z.object({ employeeId: uuid });
export type RemoveEmployeeInput = z.infer<typeof removeEmployeeInput>;
