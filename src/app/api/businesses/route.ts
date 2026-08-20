import type { NextRequest } from 'next/server';

import { methodNotAllowed, ok, withErrorHandling } from '@/lib/http';
import { businessSearchQuery, parseSearchParams } from '@/lib/validation/search';
import { searchBusinessesPaged } from '@/server/queries/discovery';

/**
 * `GET /api/businesses` — search (TECHNICAL_DESIGN.md §5.2).
 *
 * Public: no session, no guard. `businesses_select` shows only `ACTIVE` businesses to anonymous
 * callers, so suspension hides a business from search without this handler filtering on status
 * (§6.9) — the same policy that lets its own staff still see it.
 *
 * A route handler rather than a server component read because §5.3's read endpoints exist for
 * *interactive* reads: the search page re-queries on every filter change without a navigation.
 * Page loads still fetch through `server/queries/*` directly (§7).
 */
export const GET = withErrorHandling('GET /api/businesses', async (request: Request) => {
  const query = parseSearchParams(businessSearchQuery, (request as NextRequest).nextUrl.searchParams);

  return ok(await searchBusinessesPaged(query));
});

/** §12.58 — every other verb answers the envelope with an `Allow`, not Next's empty 405. */
const notAllowed = methodNotAllowed('GET');
export { notAllowed as POST, notAllowed as PUT, notAllowed as PATCH, notAllowed as DELETE };
