/**
 * Post-login default destination (TECHNICAL_DESIGN.md §12.21) — `?next=` still wins over this
 * when present; this is only the fallback when there's nowhere specific to bounce back to.
 *
 * `hasActiveEmployment` refines the BUSINESS case (§12.41): an account with no ACTIVE `employees`
 * row has no dashboard to be sent to — `(business)/dashboard/layout.tsx` would bounce it straight
 * back out — so it lands on the public home screen instead, one sidebar click from `/businesses`
 * and its "open a business / join a business" actions. Resolve the flag with
 * `hasActiveEmployment()` (`lib/auth/active-employment.ts`); it is required rather than defaulted
 * so a caller cannot silently strand a business owner on `/` by forgetting it.
 */
export function getDefaultDestination(
  accountType: 'CLIENT' | 'BUSINESS' | 'ADMIN',
  hasActiveEmployment: boolean,
): string {
  switch (accountType) {
    case 'BUSINESS':
      return hasActiveEmployment ? '/dashboard' : '/';
    case 'ADMIN':
      return '/admin';
    case 'CLIENT':
    default:
      return '/';
  }
}
