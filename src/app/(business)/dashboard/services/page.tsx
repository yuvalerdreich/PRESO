import { redirect } from 'next/navigation';

import { DashboardServicesPage } from '@/components/business/dashboard-services-page';
import {
  getCurrentBusinessDashboard,
  getCurrentEmployment,
  listDashboardEmployees,
  listDashboardServices,
} from '@/server/queries/dashboard';

/**
 * `/dashboard/services` — the whole business's catalogue (§10.7, §4.3).
 *
 * Reading across every employee is deliberate: a price list is a business-wide thing, and staff
 * need to see what a colleague charges. Writing is a different question — `upsertService` acts on
 * the caller's own `employees` row and RLS re-checks it — so `currentEmployeeId` goes down with the
 * rows to decide which cards can offer an edit button.
 */
export default async function DashboardServicesRoute() {
  const business = await getCurrentBusinessDashboard();
  if (!business) redirect('/businesses');

  const [services, employees, employment] = await Promise.all([
    listDashboardServices(business.id),
    listDashboardEmployees(business.id),
    getCurrentEmployment(),
  ]);

  return (
    <DashboardServicesPage
      services={services}
      employees={employees}
      currentEmployeeId={employment?.employeeId ?? null}
    />
  );
}
