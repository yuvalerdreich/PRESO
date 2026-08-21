import { AdminUsersPage } from '@/components/admin/admin-users-page';
import { requireAdmin } from '@/server/guards';
import { listUsers } from '@/server/queries/admin';

/**
 * `/admin/users` — every user in the platform, with the one action an admin actually has over
 * them: suspend or reactivate. `requireAdmin()` is called again here (on top of `(admin)/layout.tsx`'s
 * gate) purely to know *which* admin this is, so the row for the caller's own account can read
 * "you" instead of offering a suspend button that `suspendUser()` would refuse anyway.
 */
export default async function AdminUsersRoute() {
  const [profile, users] = await Promise.all([requireAdmin(), listUsers()]);

  return <AdminUsersPage users={users} currentUserId={profile.id} />;
}
