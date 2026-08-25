'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, Phone, Search, Users } from 'lucide-react';

import { cardChip, surfaceCard } from '@/components/common/card-styles';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { fieldPaddingEndIcon, fieldPaddingStartIcon, surfaceField } from '@/components/common/field-styles';
import { PanelHero } from '@/components/common/panel-hero';
import { useLanguage } from '@/lib/i18n/language-provider';
import { suspendUser } from '@/server/actions/admin';
import type { AccountType, AdminUser, ProfileStatus } from '@/types/domain';

const ROLE_BADGE_STYLES: Record<AccountType, string> = {
  CLIENT: 'bg-[var(--soft-violet)] text-[var(--brand-deep)]',
  BUSINESS: 'bg-sky-50 text-sky-700',
  ADMIN: 'bg-slate-800 text-white',
};

const STATUS_BADGE_STYLES: Record<ProfileStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  SUSPENDED: 'bg-rose-50 text-rose-700',
};

const FILTER_DEBOUNCE_MS = 300;

/**
 * `/admin/users` — every account matching the current filter, with the one lever an admin has
 * over any of them: suspend or reactivate (§4.5, `suspendUser`).
 *
 * Filtering used to happen entirely in the browser over the whole roster (`filterUsers()`) — the
 * same in-place shape `filterBusinesses` established for discovery. That meant every user's phone
 * number rode along in the initial payload regardless of what filter was ever applied. `status`/
 * `role`/`q` are now URL params that drive `listUsers()` on the server (`admin/users/page.tsx`):
 * changing a filter is a real navigation (debounced for the text field, immediate for the
 * dropdowns), so what the browser ever holds is bounded by the current filter, not the platform's
 * entire user count. `stats` comes from a separate `getUserStats()` count-only query so the tiles
 * stay platform-wide even though `users` itself is now just the filtered page.
 */
export function AdminUsersPage({
  users,
  stats,
  currentUserId,
  initialQuery = '',
  initialStatus = '',
  initialRole = '',
}: {
  users: AdminUser[];
  stats: { total: number; active: number; clients: number; businessStaff: number };
  currentUserId: string;
  initialQuery?: string;
  initialStatus?: ProfileStatus | '';
  initialRole?: AccountType | '';
}) {
  const { copy } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();

  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState<ProfileStatus | ''>(initialStatus);
  const [role, setRole] = useState<AccountType | ''>(initialRole);
  const [isFiltering, startFilterTransition] = useTransition();

  const [target, setTarget] = useState<{ user: AdminUser; suspended: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function pushFilters(next: { q: string; status: ProfileStatus | ''; role: AccountType | '' }) {
    const params = new URLSearchParams();
    if (next.q.trim()) params.set('q', next.q.trim());
    if (next.status) params.set('status', next.status);
    if (next.role) params.set('role', next.role);

    const target = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
    startFilterTransition(() => router.replace(target));
  }

  // Debounced: a text search re-runs `listUsers()` on the server on every commit, unlike the old
  // client-side `Array.filter` — skip the very first run so mounting with `initialQuery` doesn't
  // immediately re-navigate to the URL it was already rendered from.
  const skipNextDebounce = useRef(true);
  useEffect(() => {
    if (skipNextDebounce.current) {
      skipNextDebounce.current = false;
      return;
    }
    const timeout = setTimeout(() => pushFilters({ q: query, status, role }), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function handleStatusChange(value: ProfileStatus | '') {
    setStatus(value);
    pushFilters({ q: query, status: value, role });
  }

  function handleRoleChange(value: AccountType | '') {
    setRole(value);
    pushFilters({ q: query, status, role: value });
  }

  function confirmSuspend() {
    if (!target) return;
    setError(null);

    startTransition(async () => {
      const result = await suspendUser({ id: target.user.id, suspended: target.suspended });

      if (!result.ok) {
        setError(result.error.message || copy.admin.users.error);
        return;
      }

      setTarget(null);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PanelHero
        title={copy.admin.users.title}
        description={copy.admin.users.description}
        icon={Users}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile value={stats.businessStaff} label={copy.admin.users.stats.businessStaff} valueClassName="text-sky-300" />
          <StatTile value={stats.clients} label={copy.admin.users.stats.clients} valueClassName="text-violet-300" />
          <StatTile value={stats.active} label={copy.admin.users.stats.activeUsers} valueClassName="text-emerald-300" />
          <StatTile value={stats.total} label={copy.admin.users.stats.totalUsers} valueClassName="text-white" />
        </div>
      </PanelHero>

      <div role="group" aria-label={copy.admin.users.filters.statusLabel} className={`${surfaceCard} gap-4 p-5 sm:p-6`}>
        <div className="grid gap-4 sm:grid-cols-[repeat(2,minmax(0,220px))_1fr]">
          <FilterSelect
            value={status}
            onChange={(value) => handleStatusChange(value as ProfileStatus | '')}
            options={[
              { value: '', label: copy.admin.users.filters.statusAll },
              { value: 'ACTIVE', label: copy.admin.users.filters.statusActive },
              { value: 'SUSPENDED', label: copy.admin.users.filters.statusSuspended },
            ]}
          />

          <FilterSelect
            value={role}
            onChange={(value) => handleRoleChange(value as AccountType | '')}
            options={[
              { value: '', label: copy.admin.users.filters.roleAll },
              { value: 'CLIENT', label: copy.admin.users.filters.roleClient },
              { value: 'BUSINESS', label: copy.admin.users.filters.roleBusiness },
              { value: 'ADMIN', label: copy.admin.users.filters.roleAdmin },
            ]}
          />

          <label className="relative block">
            <Search
              className="pointer-events-none absolute inset-y-0 start-4 my-auto h-4 w-4 text-[var(--muted)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={copy.admin.users.filters.searchPlaceholder}
              className={`${surfaceField} ${fieldPaddingStartIcon}`}
            />
          </label>
        </div>
      </div>

      <div aria-busy={isFiltering} className={isFiltering ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        {users.length > 0 ? (
          <div className={`${surfaceCard} overflow-x-auto p-0`}>
            <table className="w-full min-w-[720px] text-start text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] bg-slate-50/70 text-xs font-bold text-[var(--muted)]">
                  <th className="px-5 py-3 text-start">{copy.admin.users.table.user}</th>
                  <th className="px-5 py-3 text-start">{copy.admin.users.table.role}</th>
                  <th className="px-5 py-3 text-start">{copy.admin.users.table.contact}</th>
                  <th className="px-5 py-3 text-start">{copy.admin.users.table.status}</th>
                  <th className="px-5 py-3 text-start">{copy.admin.users.table.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isSelf={user.id === currentUserId}
                    onRequestSuspend={(suspended) => {
                      setError(null);
                      setTarget({ user, suspended });
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title={copy.admin.users.emptyTitle}
            description={copy.admin.users.emptyDescription}
          />
        )}
      </div>

      {target ? (
        <ConfirmDialog
          title={target.suspended ? copy.admin.users.suspendConfirmTitle : copy.admin.users.reactivateConfirmTitle}
          description={(target.suspended
            ? copy.admin.users.suspendConfirmDescription
            : copy.admin.users.reactivateConfirmDescription
          ).replace('{name}', target.user.fullName)}
          confirmLabel={target.suspended ? copy.admin.users.confirmSuspend : copy.admin.users.confirmReactivate}
          cancelLabel={copy.admin.users.cancel}
          closeLabel={copy.admin.users.close}
          pending={isPending}
          pendingLabel={target.suspended ? copy.admin.users.pendingSuspend : copy.admin.users.pendingReactivate}
          onConfirm={confirmSuspend}
          onCancel={() => {
            setTarget(null);
            setError(null);
          }}
        />
      ) : null}

      {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}

function StatTile({
  value,
  label,
  valueClassName,
}: {
  value: number;
  label: string;
  valueClassName: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className={`text-2xl font-extrabold ${valueClassName}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-slate-300">{label}</p>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`picker-select ${surfaceField} ${fieldPaddingEndIcon} cursor-pointer appearance-none font-semibold`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute inset-y-0 my-auto h-4 w-4 text-[var(--brand)] ltr:right-4 rtl:left-4"
        aria-hidden="true"
      />
    </div>
  );
}

function UserRow({
  user,
  isSelf,
  onRequestSuspend,
}: {
  user: AdminUser;
  isSelf: boolean;
  onRequestSuspend: (suspended: boolean) => void;
}) {
  const { copy } = useLanguage();

  return (
    <tr>
      <td className="px-5 py-4 font-bold text-[var(--foreground)]">{user.fullName}</td>
      <td className="px-5 py-4">
        <span className={`${cardChip} ${ROLE_BADGE_STYLES[user.accountType]}`}>
          {copy.admin.users.role[user.accountType]}
        </span>
      </td>
      <td className="px-5 py-4 text-[var(--muted)]">
        <span className="flex items-center gap-2">
          <Phone className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
          {user.phone ?? copy.admin.users.table.noPhone}
        </span>
      </td>
      <td className="px-5 py-4">
        <span className={`${cardChip} ${STATUS_BADGE_STYLES[user.status]}`}>{copy.admin.users.status[user.status]}</span>
      </td>
      <td className="px-5 py-4">
        {isSelf ? (
          <span className="text-xs font-semibold italic text-[var(--muted)]">{copy.admin.users.self}</span>
        ) : user.status === 'SUSPENDED' ? (
          <button
            type="button"
            onClick={() => onRequestSuspend(false)}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            {copy.admin.users.reactivateAction}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onRequestSuspend(true)}
            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100"
          >
            {copy.admin.users.suspendAction}
          </button>
        )}
      </td>
    </tr>
  );
}
