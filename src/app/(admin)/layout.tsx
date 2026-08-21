import { redirect } from 'next/navigation';

import { AccountSidebar } from '@/components/common/account-sidebar';
import { ProfileSettingsProvider } from '@/components/common/profile-settings-provider';
import { PublicHeader } from '@/components/common/public-header';
import { AppError } from '@/lib/errors';
import { requireAdmin } from '@/server/guards';
import { listClientAppointments } from '@/server/queries/appointments';

/**
 * Shared admin-console chrome and authorization boundary. Every route in this group requires an
 * ADMIN account before it can render — `requireAdmin()` throws `UNAUTHENTICATED` with no session
 * and `FORBIDDEN` for any other account type, mirroring `(business)/layout.tsx`'s two-tier redirect.
 */
export default async function AdminLayout({ children }: LayoutProps<'/'>) {
  let profile;

  try {
    profile = await requireAdmin();
  } catch (error) {
    if (error instanceof AppError) redirect(error.code === 'UNAUTHENTICATED' ? '/login' : '/');
    throw error;
  }

  const appointments = await listClientAppointments();

  return (
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
  );
}
