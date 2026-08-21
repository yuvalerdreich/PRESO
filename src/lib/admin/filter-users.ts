import type { AccountType, AdminUser, ProfileStatus } from '@/types/domain';

/**
 * The admin console's user table, filtered in the browser over the already-fetched roster — the
 * same in-place-filtering shape `filterBusinesses` (§12.43) established for discovery. The whole
 * platform's user list is one small table, so there is no server round trip to save by pushing
 * these filters into `listUsers()`.
 *
 * Search matches name and phone only — `profiles` carries no email column (it lives on
 * `auth.users`, which no admin query exposes today), so an email-shaped query simply finds
 * nothing rather than silently matching a field that isn't there.
 */
export function filterUsers(
  users: AdminUser[],
  { query, status, role }: { query: string; status: ProfileStatus | ''; role: AccountType | '' },
): AdminUser[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return users.filter((user) => {
    if (status && user.status !== status) return false;
    if (role && user.accountType !== role) return false;
    if (!normalizedQuery) return true;

    return [user.fullName, user.phone ?? ''].join(' ').toLocaleLowerCase().includes(normalizedQuery);
  });
}
