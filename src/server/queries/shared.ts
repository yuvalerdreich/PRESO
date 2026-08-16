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
