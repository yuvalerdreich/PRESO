import { redirect } from 'next/navigation';

/**
 * `/join` is still unbuilt (punch-list #3). Same reasoning as `/onboarding`: forward to
 * `/businesses`, whose `JoinBusinessDialog` is the working version of this flow, instead of a
 * placeholder that dead-ends (TECHNICAL_DESIGN.md §12.41).
 */
export default async function JoinRoute() {
  redirect('/businesses');
}
