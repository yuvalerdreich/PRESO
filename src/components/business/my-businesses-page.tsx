'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BriefcaseBusiness, Building2, Clock, MapPin, Plus, Search, UserPlus, Users } from 'lucide-react';

import { actionButton, actionButtonSelected } from '@/components/common/button-styles';
import { CreateBusinessDialog } from '@/components/business/create-business-dialog';
import { JoinBusinessDialog } from '@/components/business/join-business-dialog';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { BusinessCategory, JoinableBusiness, MyBusiness, MyBusinessRelation } from '@/types/domain';

type BusinessFilter = 'all' | 'owned' | 'staff' | 'pending';

const FILTER_RELATION: Record<Exclude<BusinessFilter, 'all'>, MyBusinessRelation> = {
  owned: 'OWNER',
  staff: 'STAFF',
  pending: 'PENDING',
};

/**
 * `/businesses` — every business the caller owns, works at, or has applied to.
 *
 * The rows come from `listMyBusinesses()` (`server/queries/business-entry.ts`); the counts on the
 * filter chips and the result line are derived from those rows rather than written as literals.
 * The search box filters the already-fetched list client-side on purpose: this is the caller's own
 * handful of businesses, not `/search`'s trigram query over every business in the system.
 */
export function MyBusinessesPage({
  businesses,
  joinableBusinesses,
  categories,
}: {
  businesses: MyBusiness[];
  joinableBusinesses: JoinableBusiness[];
  categories: BusinessCategory[];
}) {
  const { copy } = useLanguage();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<BusinessFilter>('all');
  const [query, setQuery] = useState('');
  const [isCreateBusinessOpen, setIsCreateBusinessOpen] = useState(false);
  const [isJoinBusinessOpen, setIsJoinBusinessOpen] = useState(false);

  const counts = useMemo(
    () => ({
      all: businesses.length,
      owned: businesses.filter((business) => business.relation === 'OWNER').length,
      staff: businesses.filter((business) => business.relation === 'STAFF').length,
      pending: businesses.filter((business) => business.relation === 'PENDING').length,
    }),
    [businesses],
  );

  const visibleBusinesses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    return businesses.filter((business) => {
      if (activeFilter !== 'all' && business.relation !== FILTER_RELATION[activeFilter]) return false;
      if (!normalizedQuery) return true;

      return [business.name, business.area, business.address, business.categoryName, business.positionTitle ?? '']
        .join(' ')
        .toLocaleLowerCase()
        .includes(normalizedQuery);
    });
  }, [businesses, activeFilter, query]);

  const filters: { id: BusinessFilter; label: string; count: number }[] = [
    { id: 'all', label: copy.myBusinesses.all, count: counts.all },
    { id: 'owned', label: copy.myBusinesses.owned, count: counts.owned },
    { id: 'staff', label: copy.myBusinesses.activeStaff, count: counts.staff },
    { id: 'pending', label: copy.myBusinesses.pending, count: counts.pending },
  ];

  // The list is a server-fetched prop, so a create/join has to re-run the server component that
  // produced it. The dialogs call `router.refresh()` themselves; this closes them afterwards.
  function refreshAfterChange(close: () => void) {
    return () => {
      router.refresh();
      close();
    };
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#30257b] via-[#1e2857] to-[#111938] px-5 py-7 text-white shadow-[0_24px_45px_-30px_rgba(23,27,70,0.85)] sm:px-8 sm:py-9">
        <div className="flex flex-col gap-6 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{copy.myBusinesses.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              {copy.myBusinesses.description}
            </p>
          </div>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#7169ef] bg-[#4237aa] text-[#a8b0ff] shadow-inner">
            <BriefcaseBusiness className="h-7 w-7" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => setIsCreateBusinessOpen(true)}
              className={`${actionButton} rounded-2xl px-4 py-3 text-sm shadow-lg`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {copy.myBusinesses.openBusiness}
            </button>
            <button
              type="button"
              onClick={() => setIsJoinBusinessOpen(true)}
              className={`${actionButton} rounded-2xl px-4 py-3 text-sm shadow-lg`}
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              {copy.myBusinesses.joinBusiness}
            </button>
          </div>

          <div role="tablist" aria-label={copy.myBusinesses.title} className="grid grid-cols-2 gap-2 sm:flex">
            {filters.map((filter) => {
              const selected = filter.id === activeFilter;
              return (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`${actionButton} rounded-2xl px-3 py-2 text-sm ${
                    selected ? actionButtonSelected : ''
                  }`}
                >
                  {filter.label} <span className="ms-1 rounded-full bg-white/15 px-1.5 py-0.5 text-xs">{filter.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-[var(--muted)]">
          {copy.myBusinesses.resultCount.replace('{count}', String(visibleBusinesses.length))}
        </p>
        <label className="relative w-full sm:max-w-md">
          <Search
            className="pointer-events-none absolute inset-y-0 start-4 my-auto h-5 w-5 text-[var(--muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.myBusinesses.searchPlaceholder}
            className="w-full rounded-2xl border border-[var(--line)] bg-white py-3 pe-4 ps-11 text-sm text-[var(--foreground)] shadow-sm outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15"
          />
        </label>
      </div>

      {visibleBusinesses.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleBusinesses.map((business) => (
            <BusinessCard key={business.key} business={business} />
          ))}
        </div>
      ) : (
        <section className="flex min-h-80 flex-col items-center justify-center rounded-[2rem] border border-[var(--line)] bg-white px-6 py-14 text-center shadow-[0_16px_35px_-28px_rgba(23,27,70,0.55)]">
          <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600">
            <Building2 className="h-9 w-9" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-xl font-extrabold text-[var(--foreground)]">
            {businesses.length === 0 ? copy.myBusinesses.emptyTitle : copy.myBusinesses.noMatchesTitle}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">
            {businesses.length === 0 ? copy.myBusinesses.emptyDescription : copy.myBusinesses.noMatchesDescription}
          </p>
        </section>
      )}

      {isCreateBusinessOpen ? (
        <CreateBusinessDialog
          categories={categories}
          onClose={() => setIsCreateBusinessOpen(false)}
          onCreated={refreshAfterChange(() => setIsCreateBusinessOpen(false))}
        />
      ) : null}
      {isJoinBusinessOpen ? (
        <JoinBusinessDialog
          businesses={joinableBusinesses}
          onClose={() => setIsJoinBusinessOpen(false)}
          onSubmitted={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

function BusinessCard({ business }: { business: MyBusiness }) {
  const { copy } = useLanguage();

  const relationLabel = {
    OWNER: copy.myBusinesses.relationOwner,
    STAFF: copy.myBusinesses.relationStaff,
    PENDING: copy.myBusinesses.relationPending,
  }[business.relation];

  const relationStyle = {
    OWNER: 'bg-[var(--soft-violet)] text-[var(--brand-deep)]',
    STAFF: 'bg-emerald-50 text-emerald-700',
    PENDING: 'bg-amber-50 text-amber-700',
  }[business.relation];

  // An approved position that was later deactivated (§6.9's soft retire) still lists, flagged —
  // it is not bookable and the dashboard link would be a dead end.
  const isInactive = business.employeeStatus === 'INACTIVE';

  return (
    <article className="flex h-full flex-col gap-4 rounded-3xl border border-[var(--line)] bg-white p-5 shadow-[0_16px_35px_-28px_rgba(23,27,70,0.55)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-extrabold text-[var(--foreground)]">{business.name}</h3>
          {business.categoryName ? (
            <p className="mt-1 text-sm font-semibold text-[var(--brand)]">{business.categoryName}</p>
          ) : null}
        </div>
        <span className={`w-fit shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${relationStyle}`}>
          {relationLabel}
        </span>
      </div>

      <div className="grid gap-2 rounded-2xl border border-[var(--line)] bg-slate-50/70 p-4 text-sm">
        <span className="flex items-start gap-2 text-[var(--muted)]">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
          {[business.address, business.area].filter(Boolean).join(', ')}
        </span>
        <span className="flex items-center gap-2 text-[var(--muted)]">
          <Users className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
          {copy.myBusinesses.teamSize}: {business.employeeCount}
        </span>
        {business.positionTitle ? (
          <span className="flex items-center gap-2 font-semibold text-[var(--foreground)]">
            <BriefcaseBusiness className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
            {business.positionTitle}
            {isInactive ? (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">
                {copy.myBusinesses.inactivePosition}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="flex items-center gap-2 text-amber-700">
            <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
            {copy.myBusinesses.awaitingApproval}
          </span>
        )}
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        <Link
          href={`/b/${business.businessId}`}
          className={`${actionButton} rounded-full px-4 py-2 text-sm`}
        >
          {copy.myBusinesses.viewPublicPage}
        </Link>
        {business.relation !== 'PENDING' && !isInactive ? (
          <Link href="/dashboard" className={`${actionButton} rounded-full px-4 py-2 text-sm`}>
            {copy.myBusinesses.manage}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
