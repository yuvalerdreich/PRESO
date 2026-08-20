import { AppError } from '@/lib/errors';
import { methodNotAllowed, ok, withErrorHandling } from '@/lib/http';
import { createClient } from '@/lib/supabase/route';
import { parseTstzRange } from '@/lib/time';
import { uuid } from '@/lib/validation/common';
import { claimWaitlistInput } from '@/lib/validation/waitlist';

/**
 * `POST /api/waitlist/[id]/claim` (TECHNICAL_DESIGN.md §5.4, §6.7, §12.31).
 *
 * When a slot frees up, **everyone** matched is notified at once and the first to claim wins
 * (§12.15). The losers get `409` — decided by the same exclusion constraint that decides an
 * ordinary booking race, because `claim_waitlist_entry()` calls `book_appointment()` internally.
 * No reservation, no lock, no second write path (ARCHITECTURE.md §7.5).
 *
 * Three distinct failures, and conflating any two of them would mislead the client:
 *
 * - `409` — someone else claimed the slot first. The offer was real and is now gone.
 * - `410` — this entry's claim window expired (`match_expired`). Nothing was raced; the priority
 *   simply lapsed, and §12.29/§6.9 hand the entry back to `ACTIVE` on the next
 *   `sweep_waitlist_expiry()` run rather than synchronously.
 * - `422` — the slot is no longer available at all (`slot_unavailable`).
 *
 * A lost race deliberately leaves the entry `MATCHED` rather than releasing it here. §12.31
 * records why: an exception escaping a PL/pgSQL function rolls back the *entire* transaction
 * including any compensating write, so synchronous release was found to be impossible.
 */
export const POST = withErrorHandling(
  'POST /api/waitlist/[id]/claim',
  async (request: Request, context: RouteContext<'/api/waitlist/[id]/claim'>) => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new AppError('UNAUTHENTICATED', 'You need to sign in to claim this time.');

    const { id } = await context.params;
    const parsedId = uuid.safeParse(id);
    if (!parsedId.success) throw new AppError('NOT_FOUND', 'That waiting list entry no longer exists.');

    const json = await request.json().catch(() => null);
    // §12.31 added `serviceId`: an entry with `service_id IS NULL` matches any service, so the
    // claimer has to say which one they are taking.
    const input = claimWaitlistInput.parse(json);

    const { data, error } = await supabase.rpc('claim_waitlist_entry', {
      p_waitlist_entry_id: parsedId.data,
      p_employee_id: input.employeeId,
      p_service_id: input.serviceId,
      p_starts_at: new Date(input.startsAt).toISOString(),
      p_actor_profile_id: user.id,
    });
    if (error) throw error;

    const slot = parseTstzRange(data.slot);

    // Shaped exactly like `POST /api/appointments`' 201 (§5.4) — a claim produces an ordinary
    // appointment through the ordinary write path, and the client renders it identically.
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
  },
);

/** §12.58 — every other verb answers the envelope with an `Allow`, not Next's empty 405. */
const notAllowed = methodNotAllowed('POST');
export { notAllowed as GET, notAllowed as PUT, notAllowed as PATCH, notAllowed as DELETE };
