import { redirect } from 'next/navigation';

import { DashboardAppointmentsPage } from '@/components/business/dashboard-appointments-page';
import { endOfLocalDay, startOfLocalDay, toDateISO } from '@/lib/time';
import {
  getCurrentBusinessDashboard,
  listDashboardAppointments,
  listDashboardEmployees,
} from '@/server/queries/dashboard';

const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The diary is fetched one day at a time, bounded in the **business's** timezone rather than the
 * server's — "today" for a salon in Jerusalem is not the UTC day, and a 23:45 appointment belongs
 * to the day the business is living in (`listDashboardAppointments` overlaps the range for the same
 * reason: `slot` is a `tstzrange`).
 *
 * `?date=` is validated rather than trusted: anything that isn't a plain ISO date falls back to
 * today instead of reaching `startOfLocalDay` and throwing on a hand-edited URL.
 */
export default async function DashboardAppointmentsRoute({
  searchParams,
}: PageProps<'/businesses/manage/appointments'>) {
  const search = await searchParams;

  // The layout already redirects when there is no ACTIVE employees row; this resolves the same
  // business again for its id and timezone, and keeps the page honest if it is ever rendered
  // outside that shell.
  const business = await getCurrentBusinessDashboard();
  if (!business) redirect('/businesses');

  const dateISO =
    typeof search.date === 'string' && DATE_ISO.test(search.date)
      ? search.date
      : toDateISO(new Date(), business.timezone);

  const [appointments, employees] = await Promise.all([
    listDashboardAppointments(business.id, {
      from: startOfLocalDay(dateISO, business.timezone),
      to: endOfLocalDay(dateISO, business.timezone),
    }),
    listDashboardEmployees(business.id),
  ]);

  return (
    <DashboardAppointmentsPage dateISO={dateISO} appointments={appointments} employees={employees} />
  );
}
