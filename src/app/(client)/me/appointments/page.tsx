import { AppointmentsPanel } from '@/components/client/appointments-panel';
import { appointmentsRepository } from '@/lib/appointments/repository';

export default async function ClientAppointmentsPage({ searchParams }: PageProps<'/me/appointments'>) {
  const search = await searchParams;
  const backHref = typeof search.back === 'string' ? search.back : undefined;

  const [appointments, waitlistEntries] = await Promise.all([
    appointmentsRepository.listCurrentClientAppointments(),
    appointmentsRepository.listCurrentClientWaitlistEntries(),
  ]);

  return <AppointmentsPanel appointments={appointments} waitlistEntries={waitlistEntries} backHref={backHref} />;
}
