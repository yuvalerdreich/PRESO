import { AppointmentsPanel } from '@/components/client/appointments-panel';
import { listClientAppointments, listClientWaitlistEntries } from '@/server/queries/appointments';

export default async function ClientAppointmentsPage({ searchParams }: PageProps<'/me/appointments'>) {
  const search = await searchParams;
  const backHref = typeof search.back === 'string' ? search.back : undefined;

  const [appointments, waitlistEntries] = await Promise.all([
    listClientAppointments(),
    listClientWaitlistEntries(),
  ]);

  return <AppointmentsPanel appointments={appointments} waitlistEntries={waitlistEntries} backHref={backHref} />;
}
