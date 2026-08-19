import { redirect } from 'next/navigation';

import { DashboardHoursPage } from '@/components/business/dashboard-hours-page';
import {
  getCurrentBusinessDashboard,
  getCurrentEmployment,
  listAvailabilityRules,
  listBusinessHours,
  listDashboardEmployees,
} from '@/server/queries/dashboard';

/**
 * `/dashboard/hours` — working windows and shifts (§10.7, §4.5).
 *
 * `?employee=` decides whose rules are loaded, so it is a URL param; the date the screen is editing
 * is not, because `listAvailabilityRules` returns that employee's whole rule set and every date is
 * a filter over rows already in hand.
 *
 * It opens on the caller's own position — the schedule they can actually edit — rather than on the
 * first person in the roster.
 */
export default async function DashboardHoursRoute({ searchParams }: PageProps<'/dashboard/hours'>) {
  const search = await searchParams;

  const business = await getCurrentBusinessDashboard();
  if (!business) redirect('/businesses');

  const [employees, employment, businessHours] = await Promise.all([
    listDashboardEmployees(business.id),
    getCurrentEmployment(),
    listBusinessHours(business.id),
  ]);

  const requestedId = typeof search.employee === 'string' ? search.employee : undefined;
  const selectedEmployee =
    employees.find((employee) => employee.id === requestedId) ??
    employees.find((employee) => employee.id === employment?.employeeId) ??
    employees[0] ??
    null;

  const rules = selectedEmployee ? await listAvailabilityRules(selectedEmployee.id) : [];

  return (
    <DashboardHoursPage
      employees={employees}
      selectedEmployee={selectedEmployee}
      rules={rules}
      businessHours={businessHours}
      timezone={business.timezone}
      currentEmployeeId={employment?.employeeId ?? null}
    />
  );
}
