import type { NextRequest } from 'next/server';

import { methodNotAllowed, ok, withErrorHandling } from '@/lib/http';
import { availabilityQuery, parseSearchParams } from '@/lib/validation/search';
import { assertBookablePair, getAvailableSlots } from '@/server/queries/availability';

/**
 * `GET /api/availability` (TECHNICAL_DESIGN.md §5.3) — a **thin caller** over
 * `get_available_slots()`. It shapes and it never computes; §2's invariant is that availability
 * is derived in one place, on demand.
 *
 * This is the one read TanStack Query caches (§7.1), because it re-fires on every employee,
 * service and date change rather than on navigation. `staleTime` there is 30s and that is safe
 * precisely because correctness never depends on it: a stale slot list is corrected by the `409`
 * from `POST /api/appointments`, which the exclusion constraint decides.
 *
 * The `422` is the reason this handler has any logic at all. `get_available_slots()` returns zero
 * rows both for "closed that day" and for "this pair can never be booked" — its guard clause
 * returns an empty set rather than raising. `assertBookablePair()` re-checks the structural
 * conditions so the UI can say *why* the calendar is empty instead of rendering a blank month.
 */
export const GET = withErrorHandling('GET /api/availability', async (request: Request) => {
  const query = parseSearchParams(availabilityQuery, (request as NextRequest).nextUrl.searchParams);

  // Throws NOT_FOUND (404) for a missing employee or service, UNPROCESSABLE (422) for a pair that
  // is structurally unbookable. Ordered before the RPC so a 422 never masquerades as "no slots".
  await assertBookablePair(query.employeeId, query.serviceId);

  return ok(
    await getAvailableSlots(query.employeeId, query.serviceId, new Date(query.from), new Date(query.to)),
  );
});

/** §12.58 — every other verb answers the envelope with an `Allow`, not Next's empty 405. */
const notAllowed = methodNotAllowed('GET');
export { notAllowed as POST, notAllowed as PUT, notAllowed as PATCH, notAllowed as DELETE };
