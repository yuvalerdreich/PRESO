import { AdminUsersPage } from '@/components/admin/admin-users-page';
import { adminUsersQuery } from '@/lib/validation/admin';
import { requireAdmin } from '@/server/guards';
import { getUserStats, listUsers } from '@/server/queries/admin';

/**
 * `/admin/users` — every user matching the current filter, with the one action an admin actually
 * has over them: suspend or reactivate. `requireAdmin()` is called again here (on top of
 * `(admin)/layout.tsx`'s gate) purely to know *which* admin this is, so the row for the caller's
 * own account can read "you" instead of offering a suspend button that `suspendUser()` would
 * refuse anyway.
 *
 * `q`/`status`/`role` come from the URL and drive `listUsers()` directly — this used to fetch
 * every user unconditionally and filter in the browser (`filterUsers()`, now deleted), which meant
 * every user's phone number rode along in the payload no matter what was actually being looked
 * for. A malformed query string (hand-edited, not something the UI produces) falls back to no
 * filter rather than a 400 — a bad param on a page navigation should degrade, not break the page.
 */
export default async function AdminUsersRoute({ searchParams }: PageProps<'/admin/users'>) {
  const raw = await searchParams;
  const readParam = (value: string | string[] | undefined) =>
    typeof value === 'string' && value !== '' ? value : undefined;

  const parsed = adminUsersQuery.safeParse({
    q: readParam(raw.q),
    status: readParam(raw.status),
    role: readParam(raw.role),
  });
  const filters = parsed.success ? parsed.data : {};

  const [profile, users, stats] = await Promise.all([requireAdmin(), listUsers(filters), getUserStats()]);

  return (
    <AdminUsersPage
      users={users}
      stats={stats}
      currentUserId={profile.id}
      initialQuery={filters.q ?? ''}
      initialStatus={filters.status ?? ''}
      initialRole={filters.role ?? ''}
    />
  );
}
