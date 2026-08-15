import { AppError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * requireSession / requireEmployeeOf / requireOwnerOf / requireAdmin (TECHNICAL_DESIGN.md
 * §1) — the fine-grained checks proxy.ts's coarse gate defers to (§7.3), used from route
 * group layouts and server actions. Each throws an AppError on failure rather than
 * redirecting or returning an ActionResult directly, so the same guard works in both
 * contexts: a layout wraps the call and calls next/navigation's redirect() on catch, while
 * a server action's withAction() wrapper (lib/errors.ts, not built yet) converts the thrown
 * AppError into `{ ok: false, error }` (§5.5, §8.3 — actions never throw across the
 * boundary, but the guard itself doesn't need to know which caller it has).
 *
 * All four use the RLS-bound server client (lib/supabase/server.ts) — never admin.ts. RLS
 * re-checks everything these guards decide (ARCHITECTURE.md §3.3); a bug here narrows
 * access at worst, it can never widen it.
 */

/** Session required, account must be ACTIVE. Returns the caller's profile row. */
export async function requireSession(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AppError('UNAUTHENTICATED', 'You need to sign in to do that.');
  }

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();

  if (!profile) {
    throw new AppError('UNAUTHENTICATED', 'You need to sign in to do that.');
  }

  if (profile.status !== 'ACTIVE') {
    throw new AppError('FORBIDDEN', 'This account has been suspended.');
  }

  return profile;
}

/**
 * Any ACTIVE employee of `businessId` — owner or staff (§12.1: day-to-day management
 * rights are equal; the founder's one remaining exclusive power is join-request decisions,
 * gated separately by requireOwnerOf).
 */
export async function requireEmployeeOf(businessId: string): Promise<Profile> {
  const profile = await requireSession();
  const supabase = await createClient();

  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('business_id', businessId)
    .eq('profile_id', profile.id)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (!employee) {
    throw new AppError('FORBIDDEN', "You don't have permission to do that.");
  }

  return profile;
}

/** The founder of `businessId` specifically — join-request decisions, roster management (§4.2, §6.8 rule 6). */
export async function requireOwnerOf(businessId: string): Promise<Profile> {
  const profile = await requireSession();
  const supabase = await createClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('id', businessId)
    .eq('owner_profile_id', profile.id)
    .maybeSingle();

  if (!business) {
    throw new AppError('FORBIDDEN', "You don't have permission to do that.");
  }

  return profile;
}

/** A provisioned ADMIN — never reachable via sign-up (§6.8 rules 1–2). */
export async function requireAdmin(): Promise<Profile> {
  const profile = await requireSession();

  if (profile.account_type !== 'ADMIN') {
    throw new AppError('FORBIDDEN', "You don't have permission to do that.");
  }

  return profile;
}
