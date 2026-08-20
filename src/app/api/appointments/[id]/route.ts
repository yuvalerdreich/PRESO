import { AppError } from '@/lib/errors';
import { methodNotAllowed, ok, withErrorHandling } from '@/lib/http';
import { createClient } from '@/lib/supabase/route';
import { parseTstzRange } from '@/lib/time';
import { patchAppointmentInput } from '@/lib/validation/booking';
import { uuid } from '@/lib/validation/common';

/**
 * `PATCH /api/appointments/[id]` (TECHNICAL_DESIGN.md §5.4, §6.3–§6.5).
 *
 * Four actions, four `security definer` RPCs, and **no direct write anywhere**. `appointments`
 * has no INSERT/UPDATE/DELETE policy and no grant for `authenticated` (0010_rls.sql) — a direct
 * write fails at the privilege check before RLS is even consulted. That is the design, not an
 * oversight: five RPCs are the only writers (§4.4).
 *
 * A route handler rather than actions for the same reason as booking: `reschedule` can lose the
 * race for its new slot and must answer `409`, and `cancel` inside the cancellation window must
 * answer `422` with the policy stated. Both are status codes the UI reacts to differently.
 *
 * Cancel is a **soft** delete — `status = 'CANCELLED'`, `cancelled_at` set. Never a hard delete:
 * the row leaving the exclusion index via the constraint's `WHERE status <> 'CANCELLED'` clause is
 * exactly what frees the slot, and the trigger on that transition is what fires the waitlist
 * matcher (§6.7).
 */
export const PATCH = withErrorHandling(
  'PATCH /api/appointments/[id]',
  async (request: Request, context: RouteContext<'/api/appointments/[id]'>) => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new AppError('UNAUTHENTICATED', 'You need to sign in to change an appointment.');

    const { id } = await context.params;
    const parsedId = uuid.safeParse(id);
    if (!parsedId.success) throw new AppError('NOT_FOUND', 'That appointment no longer exists.');

    const json = await request.json().catch(() => null);
    const input = patchAppointmentInput.parse(json);

    // Every branch lets the RPC's error propagate untouched — §8.2 maps illegal_transition to
    // 422, cancellation_window_closed to 422, 42501 to 403 and 23P01 to 409.
    switch (input.action) {
      case 'cancel': {
        const { data, error } = await supabase.rpc('cancel_appointment', {
          p_appointment_id: parsedId.data,
          p_actor_profile_id: user.id,
        });
        if (error) throw error;
        return ok(toResponse(data));
      }

      case 'approve': {
        const { data, error } = await supabase.rpc('approve_appointment', {
          p_appointment_id: parsedId.data,
          p_actor_profile_id: user.id,
        });
        if (error) throw error;
        return ok(toResponse(data));
      }

      case 'reject': {
        const { data, error } = await supabase.rpc('reject_appointment', {
          p_appointment_id: parsedId.data,
          p_actor_profile_id: user.id,
          ...(input.reason ? { p_reason: input.reason } : {}),
        });
        if (error) throw error;
        return ok(toResponse(data));
      }

      case 'reschedule': {
        // Cancel + insert in one transaction (§6.4, §12.7). Losing the race for the new slot
        // rolls the whole thing back, so the original appointment survives untouched — the caller
        // gets 409 and still holds their old time.
        const { data, error } = await supabase.rpc('reschedule_appointment', {
          p_appointment_id: parsedId.data,
          p_new_starts_at: new Date(input.startsAt).toISOString(),
          p_actor_profile_id: user.id,
        });
        if (error) throw error;
        // §5.4: a reschedule returns the **new** row, which is a different id than was requested.
        return ok(toResponse(data));
      }
    }
  },
);

type AppointmentRow = {
  id: string;
  slot: unknown;
  status: string;
  employee_id: string;
  service_id: string;
};

function toResponse(row: AppointmentRow) {
  const slot = parseTstzRange(row.slot);

  return {
    id: row.id,
    status: row.status,
    startsAt: slot?.startsAt.toISOString() ?? null,
    endsAt: slot?.endsAt.toISOString() ?? null,
    employeeId: row.employee_id,
    serviceId: row.service_id,
  };
}

/** §12.58 — every other verb answers the envelope with an `Allow`, not Next's empty 405. */
const notAllowed = methodNotAllowed('PATCH');
export { notAllowed as GET, notAllowed as POST, notAllowed as PUT, notAllowed as DELETE };
