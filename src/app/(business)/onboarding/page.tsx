import { redirect } from 'next/navigation';

/**
 * `/onboarding` is still unbuilt (punch-list #3). Until the real choice screen exists it forwards
 * to `/businesses`, which already offers both ways in — "open a new business" and "join an existing
 * business" — rather than rendering a placeholder the user cannot act on (TECHNICAL_DESIGN.md
 * §12.41). Replace the redirect with the real screen when it is built; nothing else links here.
 */
export default async function OnboardingRoute() {
  redirect('/businesses');
}
