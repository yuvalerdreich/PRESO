import { AppointmentsPanelProvider } from '@/components/common/appointments-panel-provider';
import { PublicHeader } from '@/components/common/public-header';
import { appointmentsRepository } from '@/lib/appointments/repository';
import { createClient } from '@/lib/supabase/server';

export default async function PublicLayout({ children }: LayoutProps<'/'>) {
  const [appointments, waitlistEntries, currentUser] = await Promise.all([
    appointmentsRepository.listCurrentClientAppointments(),
    appointmentsRepository.listCurrentClientWaitlistEntries(),
    getCurrentUser(),
  ]);

  return (
    <AppointmentsPanelProvider appointments={appointments} waitlistEntries={waitlistEntries}>
      <div className="flex min-h-full flex-col">
        <PublicHeader appointments={appointments} currentUser={currentUser} />
        <main className="flex-1">{children}</main>
      </div>
    </AppointmentsPanelProvider>
  );
}

async function getCurrentUser(): Promise<{ fullName: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  if (!profile) return null;

  return { fullName: profile.full_name };
}
