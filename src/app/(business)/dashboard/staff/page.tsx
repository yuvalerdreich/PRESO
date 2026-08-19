import { redirect } from 'next/navigation';

import { DashboardStaffPage } from '@/components/business/dashboard-staff-page';
import {
  getCurrentBusinessDashboard,
  listDashboardEmployees,
  listJoinRequests,
} from '@/server/queries/dashboard';

/**
 * `/dashboard/staff` — the roster and the join queue on one screen (§10.7, §4.2).
 *
 * Only PENDING requests reach the queue: an approved one is already a card in the roster above it,
 * and a rejected one is settled — `decide_join_request()` refuses to re-decide either, so listing
 * them would offer buttons that cannot fire.
 */
export default async function DashboardStaffRoute() {
  const business = await getCurrentBusinessDashboard();
  if (!business) redirect('/businesses');

  const [employees, requests] = await Promise.all([
    listDashboardEmployees(business.id),
    listJoinRequests(business.id),
  ]);

  return (
    <DashboardStaffPage
      employees={employees}
      requests={requests.filter((request) => request.status === 'PENDING')}
      isOwner={business.isOwner}
    />
  );
}
