import { redirect } from 'next/navigation';

import { DashboardWaitlistPage } from '@/components/business/dashboard-waitlist-page';
import { getCurrentBusinessDashboard, listDashboardWaitlist } from '@/server/queries/dashboard';

/**
 * `/businesses/manage/waitlist` — who is waiting for a cancellation (§6.7, §10.7).
 *
 * Read-only: which waiting client gets a freed slot is decided by `match_waitlist_for_slot()` and
 * then by whoever confirms first, never by the business picking someone here.
 */
export default async function DashboardWaitlistRoute() {
  const business = await getCurrentBusinessDashboard();
  if (!business) redirect('/businesses');

  return <DashboardWaitlistPage entries={await listDashboardWaitlist(business.id)} />;
}
