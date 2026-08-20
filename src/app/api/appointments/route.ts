import { AppError } from '@/lib/errors';
import { methodNotAllowed, ok, withErrorHandling } from '@/lib/http';
import { createClient } from '@/lib/supabase/route';
import { parseTstzRange } from '@/lib/time';
import { createAppointmentInput } from '@/lib/validation/booking';
import { getEmployeeById } from '@/server/queries/discovery';

/**
 * `POST /api/appointments` — the critical one (TECHNICAL_DESIGN.md §5.4, §6.2).
 *
 * **This is a route handler and not a server action, on purpose.** The client has to distinguish
 * "created" from "someone else took it", and only a status code carries that: `201` versus `409`.
 * A server action returns `ActionResult` and would flatten the two into one error shape
 * (ARCHITECTURE.md §6.14, drawio page 3).
 *
 * The `409` is a contract, not a failure. It arrives as SQLSTATE `23P01` from the
 * `appointments_no_overlap` exclusion constraint on `COMMIT` — the mechanism itself, not a bug —
 * and `withErrorHandling` maps it through §8.2. Nothing in this file detects the conflict, and
 * nothing should: an application-level check would be a race, since Vercel invocations are
 * concurrent serverless functions with no shared memory. The database is the only thing that can
 * decide, which is the whole reason the constraint exists.
 *
 * Note what else this handler does *not* do: it never validates that `startsAt` is currently
 * bookable. `book_appointment()` re-runs `get_available_slots()` inside the same transaction as
 * the insert (§6.2), so checking here would be advisory at best and misleading at worst.
 *
 * `CONFIRMED` vs `PENDING` also comes from the RPC's returned row rather than from reading the
 * business's `approval_policy` here — the previous mock-backed version decided it client-side,
 * which meant two places could disagree about what was actually stored.
 */
export const POST = withErrorHandling('POST /api/appointments', async (request: Request) => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AppError('UNAUTHENTICATED', 'You need to sign in to book an appointment.');

  const json = await request.json().catch(() => null);
  const input = createAppointmentInput.parse(json);

  // §12.5 — staff booking on behalf of a client. `book_appointment()` re-checks that the actor is
  // ACTIVE staff of the employee's business, but the caller is checked here too so a non-staff
  // attempt is an explicit 403 with §9.4's message rather than the RPC's generic
  // insufficient_privilege.
  let clientProfileId = user.id;

  if (input.clientProfileId && input.clientProfileId !== user.id) {
    const employee = await getEmployeeById(input.employeeId);
    if (!employee) throw new AppError('NOT_FOUND', 'That staff member no longer exists.');

    const { data: membership, error: membershipError } = await supabase
      .from('employees')
      .select('id')
      .eq('business_id', employee.businessId)
      .eq('profile_id', user.id)
      .eq('status', 'ACTIVE')
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) throw new AppError('FORBIDDEN', 'Only staff can book on behalf of a client.');

    clientProfileId = input.clientProfileId;
  }

  const { data, error } = await supabase.rpc('book_appointment', {
    p_client_profile_id: clientProfileId,
    p_employee_id: input.employeeId,
    p_service_id: input.serviceId,
    p_starts_at: new Date(input.startsAt).toISOString(),
    p_actor_profile_id: user.id,
  });
  // Deliberately unhandled: 23P01 → 409, 42501 → 403, 23503 → 404, slot_unavailable → 422.
  if (error) throw error;

  // `slot` is a tstzrange, so startsAt/endsAt are parsed back out of the stored row rather than
  // echoed from the request — what the database committed is the authority on what was booked.
  const slot = parseTstzRange(data.slot);

  return ok(
    {
      id: data.id,
      status: data.status,
      startsAt: slot?.startsAt.toISOString() ?? new Date(input.startsAt).toISOString(),
      endsAt: slot?.endsAt.toISOString() ?? null,
      employeeId: data.employee_id,
      serviceId: data.service_id,
    },
    201,
  );
});

/** §12.58 — every other verb answers the envelope with an `Allow`, not Next's empty 405. */
const notAllowed = methodNotAllowed('POST');
export { notAllowed as GET, notAllowed as PUT, notAllowed as PATCH, notAllowed as DELETE };
