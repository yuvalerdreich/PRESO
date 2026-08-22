import { AccountSidebar } from '@/components/common/account-sidebar';
import { AppointmentsPanelProvider } from '@/components/common/appointments-panel-provider';
import { AuthModalProvider } from '@/components/common/auth-modal-provider';
import { ProfileSettingsProvider } from '@/components/common/profile-settings-provider';
import { PublicHeader } from '@/components/common/public-header';
import { listClientAppointments, listClientWaitlistEntries } from '@/server/queries/appointments';
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
    listClientAppointments(),
    listClientWaitlistEntries(),
    getCurrentUser(),
  ]);

  return (
    <AuthModalProvider>
      <AppointmentsPanelProvider appointments={appointments} waitlistEntries={waitlistEntries}>
        <ProfileSettingsProvider
          initialLocation={currentUser?.location ?? ''}
          initialDateOfBirth={currentUser?.dateOfBirth ?? ''}
          accountType={currentUser?.accountType ?? 'CLIENT'}
        >
          <div className="flex min-h-full flex-col">
            <PublicHeader currentUser={currentUser ? { fullName: currentUser.fullName } : null} />
            <div className="flex flex-1">
              <AccountSidebar
                appointments={appointments}
                accountType={currentUser?.accountType}
                isAuthenticated={currentUser !== null}
              />
              <main className="min-w-0 flex-1">{children}</main>
            </div>
          </div>
        </ProfileSettingsProvider>
      </AppointmentsPanelProvider>
    </AuthModalProvider>
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
