import { redirect } from 'next/navigation';

import { AccountSidebar } from '@/components/common/account-sidebar';
import { AuthModalProvider } from '@/components/common/auth-modal-provider';
import { NotificationsProvider } from '@/components/common/notifications-provider';
import { ProfileSettingsProvider } from '@/components/common/profile-settings-provider';
import { PublicHeader } from '@/components/common/public-header';
import { AppError } from '@/lib/errors';
import { requireSession } from '@/server/guards';
import { listClientAppointments } from '@/server/queries/appointments';
import { countUnread, listNotifications } from '@/server/queries/notifications';

/**
 * Shared business area chrome and authorization boundary. Every route in this
 * group requires an active BUSINESS account before it can render.
 */
export default async function BusinessLayout({ children }: LayoutProps<'/'>) {
  let profile;

  try {
    profile = await requireSession();
  } catch (error) {
    if (error instanceof AppError) redirect('/login');
    throw error;
  }

  // An ADMIN account carries every business-portal permission in addition to the admin console
  // (§5) — this group is not BUSINESS-exclusive.
  if (profile.account_type !== 'BUSINESS' && profile.account_type !== 'ADMIN') redirect('/');

  const [appointments, notifications, unreadCount] = await Promise.all([
    listClientAppointments(),
    listNotifications(),
    countUnread(),
  ]);

  return (
    <AuthModalProvider>
      <NotificationsProvider profileId={profile.id} initialNotifications={notifications} initialUnreadCount={unreadCount}>
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
      </NotificationsProvider>
    </AuthModalProvider>
  );
}
