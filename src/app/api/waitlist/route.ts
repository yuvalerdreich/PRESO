import { AppError } from '@/lib/errors';
import { methodNotAllowed, ok, withErrorHandling } from '@/lib/http';
import { createClient } from '@/lib/supabase/route';
import { waitlistEntryInput } from '@/lib/validation/waitlist';

/**
 * `POST /api/waitlist` (TECHNICAL_DESIGN.md §5.4, §3.10).
 *
 * Two nullable-means-"any" conventions carry through from the schema and are worth stating,
 * because both look like missing data otherwise:
 *
 * - `serviceId` omitted → `service_id IS NULL` → the entry matches **any** service.
 * - `employeeIds` empty → **no** `waitlist_employee_targets` rows → any employee in the business.
 *   Materialising one row per current employee instead would silently freeze the entry to today's
 *   roster, so a stylist hired tomorrow could never satisfy it.
 *
 * The duplicate case (§5.4's `409`) is left to the database rather than pre-checked here: an
 * overlapping entry for the same client and business is caught by the constraint, and checking
 * first would be a race that still needs the constraint underneath.
 */
export const POST = withErrorHandling('POST /api/waitlist', async (request: Request) => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AppError('UNAUTHENTICATED', 'You need to sign in to join a waiting list.');

  const json = await request.json().catch(() => null);
  const input = waitlistEntryInput.parse(json);

  const { data: entry, error } = await supabase
    .from('waitlist_entries')
    .insert({
      client_profile_id: user.id,
      business_id: input.businessId,
      service_id: input.serviceId ?? null,
      from_ts: new Date(input.fromTs).toISOString(),
      to_ts: new Date(input.toTs).toISOString(),
    })
    .select('id, status')
    .single();
  if (error) throw error;

  if (input.employeeIds.length > 0) {
    const { error: targetsError } = await supabase.from('waitlist_employee_targets').insert(
      input.employeeIds.map((employeeId) => ({
        waitlist_entry_id: entry.id,
        employee_id: employeeId,
      })),
    );

    if (targetsError) {
      // The entry and its targets are two statements, so a failure here would otherwise leave an
      // entry that matches *any* employee — strictly broader than what the client asked for, and
      // therefore the wrong direction to fail in. Removing it makes the request atomic in effect.
      await supabase.from('waitlist_entries').delete().eq('id', entry.id);
      throw targetsError;
    }
  }

  return ok({ id: entry.id, status: entry.status }, 201);
});

/** §12.58 — every other verb answers the envelope with an `Allow`, not Next's empty 405. */
const notAllowed = methodNotAllowed('POST');
export { notAllowed as GET, notAllowed as PUT, notAllowed as PATCH, notAllowed as DELETE };
