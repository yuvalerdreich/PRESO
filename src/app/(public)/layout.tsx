import { AppointmentsPanelProvider } from '@/components/common/appointments-panel-provider';
import { ProfileSettingsProvider } from '@/components/common/profile-settings-provider';
import { PublicHeader } from '@/components/common/public-header';
import { appointmentsRepository } from '@/lib/appointments/repository';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';

type CurrentUser = {
  fullName: string;
  location: string;
  dateOfBirth: string;
  accountType: Database['public']['Enums']['account_type'];
};

export default async function PublicLayout({ children }: LayoutProps<'/'>) {
  const [appointments, waitlistEntries, currentUser] = await Promise.all([
    appointmentsRepository.listCurrentClientAppointments(),
    appointmentsRepository.listCurrentClientWaitlistEntries(),
    getCurrentUser(),
  ]);

  return (
    <AppointmentsPanelProvider appointments={appointments} waitlistEntries={waitlistEntries}>
      <ProfileSettingsProvider
        initialLocation={currentUser?.location ?? ''}
        initialDateOfBirth={currentUser?.dateOfBirth ?? ''}
        accountType={currentUser?.accountType ?? 'CLIENT'}
      >
        <div className="flex min-h-full flex-col">
          <PublicHeader
            appointments={appointments}
            currentUser={currentUser ? { fullName: currentUser.fullName } : null}
          />
          <main className="flex-1">{children}</main>
        </div>
      </ProfileSettingsProvider>
    </AppointmentsPanelProvider>
  );
}

async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, location, date_of_birth, account_type')
    .eq('id', user.id)
    .single();
  if (!profile) return null;

  return {
    fullName: profile.full_name,
    location: profile.location ?? '',
    dateOfBirth: profile.date_of_birth ?? '',
    accountType: profile.account_type,
  };
}
