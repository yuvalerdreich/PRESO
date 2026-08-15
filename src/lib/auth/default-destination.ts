/**
 * Post-login default destination (TECHNICAL_DESIGN.md §12.21) — `?next=` still wins over this
 * when present; this is only the fallback when there's nowhere specific to bounce back to.
 */
export function getDefaultDestination(accountType: 'CLIENT' | 'BUSINESS' | 'ADMIN'): string {
  switch (accountType) {
    case 'BUSINESS':
      return '/dashboard';
    case 'ADMIN':
      return '/admin';
    case 'CLIENT':
    default:
      return '/';
  }
}
