import { AppointmentsPanelProvider } from '@/components/common/appointments-panel-provider';
import { PublicHeader } from '@/components/common/public-header';
import { appointmentsRepository } from '@/lib/appointments/repository';

export default async function PublicLayout({ children }: LayoutProps<'/'>) {
  const [appointments, waitlistEntries] = await Promise.all([
    appointmentsRepository.listCurrentClientAppointments(),
    appointmentsRepository.listCurrentClientWaitlistEntries(),
  ]);

  return (
    <AppointmentsPanelProvider appointments={appointments} waitlistEntries={waitlistEntries}>
      <div className="flex min-h-full flex-col">
        <PublicHeader appointments={appointments} />
        <main className="flex-1">{children}</main>
      </div>
    </AppointmentsPanelProvider>
  );
}
