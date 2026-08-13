import { AppointmentsPanel } from '@/components/client/appointments-panel';
import { appointmentsRepository } from '@/lib/appointments/repository';

export default async function ClientAppointmentsPage() {
  const [appointments, waitlistEntries] = await Promise.all([
    appointmentsRepository.listCurrentClientAppointments(),
    appointmentsRepository.listCurrentClientWaitlistEntries(),
  ]);

  return <AppointmentsPanel appointments={appointments} waitlistEntries={waitlistEntries} />;
}
