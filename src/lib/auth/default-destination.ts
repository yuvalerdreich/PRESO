/**
 * Post-login default destination — `?next=` still wins over this when present; this is only the
 * fallback when there's nowhere specific to bounce back to.
 *
 * **Every role lands on the public home screen** (מסך ראשי), CLIENT, BUSINESS and ADMIN alike.
 * This supersedes the earlier role-split routing (§12.21: client→`/`, business→`/dashboard`,
 * admin→`/admin`) and its §12.41 refinement, which sent only an *unemployed* BUSINESS account to
 * `/` and left an employed one on `/dashboard`. Signing in now always opens the same screen, and
 * the portals are one sidebar click away from it.
 *
 * Deliberately still a function rather than an inlined `'/'`: it keeps one named place that both
 * sign-in paths (`components/auth/login-form.tsx` and `app/auth/callback/route.ts`) agree on, so
 * reintroducing role-dependent routing is a single edit rather than a hunt.
 */
export function getDefaultDestination(): string {
  return '/';
}
