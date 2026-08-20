import { AppError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';

/**
 * Helpers shared by the query modules (TECHNICAL_DESIGN.md §7: server components fetch directly
 * via `@supabase/ssr`, with no API layer for page loads).
 *
 * Everything under `server/queries/*` uses the RLS-bound client from `lib/supabase/server.ts` and
 * never `admin.ts`. That is what makes these safe to call straight from a Server Component: the
 * database, not the function, decides which rows the caller may see. A query that forgets a
 * `.eq('business_id', …)` narrows nothing it shouldn't — RLS has already scoped it.
 */

/** The Storage bucket business photos live in. */
const BUSINESS_PHOTOS_BUCKET = 'business-photos';

/**
 * `businesses.photo_paths` holds Supabase Storage object paths — except in `supabase/seed.sql`,
 * which stores absolute URLs so the demo has imagery without anyone uploading objects first.
 * Both are accepted: anything that parses as an absolute URL is passed through untouched,
 * everything else is resolved through Storage's public-URL builder.
 */
export function resolvePhotoUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[] | null,
): string {
  const first = paths?.[0];
  if (!first) return '';

  if (/^https?:\/\//i.test(first)) return first;

  return supabase.storage.from(BUSINESS_PHOTOS_BUCKET).getPublicUrl(first).data.publicUrl;
}

/**
 * Throw the §8.2 `NOT_FOUND` for a row that either doesn't exist or is hidden by RLS.
 *
 * §8.1 merges the two deliberately: answering `403` for a row the caller may not see would
 * confirm that it exists, which is exactly what cross-tenant isolation is meant to prevent.
 */
export function notFound(what: string): AppError {
  return new AppError('NOT_FOUND', `${what} no longer exists.`);
}

/**
 * PostgREST reports "no rows" from `.single()` as an error rather than a null row. That is a
 * legitimate outcome for most of these reads, so callers use `.maybeSingle()` and this helper
 * decides whether the *error* was real.
 */
export function isMissingRow(error: { code?: string | null } | null): boolean {
  return error?.code === 'PGRST116';
}

/**
 * How the signed-in viewer relates to each of a set of businesses: their own, or someone else's.
 *
 * Discovery is anonymous-safe and stays that way — no session means an empty map and every
 * business reads as somebody else's, which is correct. For a signed-in viewer this answers the one
 * question the public surfaces need but cannot ask per-card without N queries: a business you own
 * or work at is badged "העסק שלך" on the grid and refuses to open its booking flow (§12.55).
 *
 * `OWNER` wins over `STAFF` when both are true, which they almost always are — §6.8 rule 3 makes
 * the founder employee #1 of their own business, so the two are the same person by construction.
 *
 * Both reads are RLS-bound and own-row-scoped by their own policies (`employees` is readable by
 * the business's staff; `businesses.owner_profile_id` is public), so this adds no exposure.
 */
export type ViewerBusinessRelation = 'OWNER' | 'STAFF';

export async function loadViewerBusinessRelations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  businessIds: string[],
): Promise<Map<string, ViewerBusinessRelation>> {
  const relations = new Map<string, ViewerBusinessRelation>();
  if (businessIds.length === 0) return relations;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return relations;

  const [{ data: employments }, { data: owned }] = await Promise.all([
    supabase
      .from('employees')
      .select('business_id')
      .eq('profile_id', user.id)
      .eq('status', 'ACTIVE')
      .in('business_id', businessIds),
    supabase.from('businesses').select('id').eq('owner_profile_id', user.id).in('id', businessIds),
  ]);

  for (const row of employments ?? []) relations.set(row.business_id, 'STAFF');
  // Second, so it overwrites: owning is the stronger statement of the two.
  for (const row of owned ?? []) relations.set(row.id, 'OWNER');

  return relations;
}
