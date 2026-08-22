import { redirect } from 'next/navigation';

import { AccountSidebar } from '@/components/common/account-sidebar';
import { AuthModalProvider } from '@/components/common/auth-modal-provider';
import { ProfileSettingsProvider } from '@/components/common/profile-settings-provider';
import { PublicHeader } from '@/components/common/public-header';
import { AppError } from '@/lib/errors';
import { requireSession } from '@/server/guards';
import { listClientAppointments } from '@/server/queries/appointments';

export default async function MeLayout({ children }: LayoutProps<'/me'>) {
  let profile;

  try {
    profile = await requireSession();
  } catch (error) {
    if (error instanceof AppError) redirect('/login');
    throw error;
  }

  const appointments = await listClientAppointments();

  return (
    <AuthModalProvider>
      <ProfileSettingsProvider
        initialLocation={profile.location ?? ''}
        initialDateOfBirth={profile.date_of_birth ?? ''}
        accountType={profile.account_type}
      >
        <div className="flex min-h-full flex-col">
          <PublicHeader currentUser={{ fullName: profile.full_name }} />
          <div className="flex flex-1">
            <AccountSidebar appointments={appointments} accountType={profile.account_type} />
            <main className="min-w-0 flex-1">{children}</main>
          </div>
        </div>
      </ProfileSettingsProvider>
    </AuthModalProvider>
  );
}
