import { timingSafeEqual } from 'node:crypto';

import { AppError } from '@/lib/errors';
import { methodNotAllowed, ok, withErrorHandling } from '@/lib/http';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * `GET /api/cron/appointment-reminders` (TECHNICAL_DESIGN.md §12.x) — the daily sweep behind the
 * "24 hours before any appointment" notification. Cron-driven (`vercel.json`), authenticated by
 * comparing the `Authorization: Bearer` header against `CRON_SECRET` in constant time, same
 * pattern the (now-deleted) email webhook used for its own shared secret.
 *
 * Uses the service-role admin client because `sweep_appointment_reminders()` has to read across
 * every user's appointments, not just the caller's own RLS-visible rows — there is no caller in
 * the RLS sense here, only Vercel's cron invoker.
 */
export const GET = withErrorHandling('GET /api/cron/appointment-reminders', async (request: Request) => {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new AppError('UNAVAILABLE', 'Appointment reminders are not configured on this deployment.');

  const presented = (request.headers.get('authorization') ?? '').replace(/^Bearer /, '');
  if (!matches(presented, secret)) {
    throw new AppError('UNAUTHENTICATED', 'This endpoint requires a valid bearer token.');
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('sweep_appointment_reminders');
  if (error) throw error;

  return ok({ reminded: data?.[0]?.reminded ?? 0 });
});

/** §12.58's convention — every other verb answers the envelope with an `Allow`, not Next's empty 405. */
const notAllowed = methodNotAllowed('GET');
export { notAllowed as POST, notAllowed as PUT, notAllowed as PATCH, notAllowed as DELETE };

/** Constant-time compare, and length-safe: `timingSafeEqual` throws on a length mismatch. */
function matches(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
