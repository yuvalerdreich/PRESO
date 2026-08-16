import { z } from 'zod';

/**
 * Primitives shared across the §9 schemas. Extracted so the rules that appear in more than one
 * payload — `phone` in both sign-up and business details, `fullName` in both identity and
 * profile — have exactly one definition and one message.
 *
 * Each mirrors a `CHECK` constraint in §3's DDL. The layering §9 describes is deliberate:
 * client validation is UX, the server re-parse is the boundary, and the `CHECK` is the final
 * backstop. Where the two disagree the database wins, so these bounds are copied from the DDL
 * rather than chosen independently.
 */

/** `profiles.phone` / `businesses.phone` CHECK: `^\+?[0-9\-\s]{9,15}$`. */
export const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9\-\s]{9,15}$/, 'Enter a valid phone number');

/** `profiles.full_name` CHECK: trimmed length 2–80. */
export const fullName = z.string().trim().min(2, 'Enter your full name').max(80, 'Enter your full name');

export const uuid = z.uuid('That reference is not valid');

/** An optional free-text field where an empty string from a form means "not provided". */
export const optionalText = (max: number, message: string) =>
  z.union([z.string().trim().max(max, message), z.literal('')]).optional();

/** "HH:mm", the shape `business_hours` and `employee_availability_rules` store as `time`. */
export const timeHHmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter a time as HH:mm');

/** 0 = Sunday, matching `business_hours.day_of_week` and the DDL's 0–6 CHECK. */
export const dayOfWeek = z.coerce.number().int().min(0).max(6);

/**
 * An IANA zone name (§12.3). Validated by asking the platform rather than shipping a list:
 * `Intl.DateTimeFormat` throws `RangeError` for an unknown zone, and its notion of "known" is
 * the same tzdata Postgres validates against in `0009`'s business-timezone trigger.
 */
export const timezone = z.string().refine(
  (value) => {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Choose a valid timezone' },
);

/** An absolute instant. Accepts what `Date.toISOString()` produces and what a form emits. */
export const isoDateTime = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), { message: 'Enter a valid date and time' });

/** §9.4 — a booking or waitlist range may never start in the past. */
export const futureIsoDateTime = isoDateTime.refine((value) => Date.parse(value) > Date.now(), {
  message: 'Choose a time in the future',
});

export const MILLISECONDS_PER_DAY = 86_400_000;
