'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BriefcaseBusiness, Building2, Clock, MapPin, Plus, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';

import { CreateBusinessDialog } from '@/components/business/create-business-dialog';
import { JoinBusinessDialog } from '@/components/business/join-business-dialog';
import {
  actionButton,
  actionButtonChip,
  actionButtonLarge,
  actionButtonSelected,
} from '@/components/common/button-styles';
import {
  cardAction,
  cardChip,
  cardHoverLift,
  cardMetaIcon,
  cardMetaList,
  cardMetaRow,
  cardStretchedLink,
  cardSubtitle,
  cardTitle,
  surfaceCard,
} from '@/components/common/card-styles';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorDialog } from '@/components/common/error-dialog';
import { PanelHero } from '@/components/common/panel-hero';
import { useLanguage } from '@/lib/i18n/language-provider';
import { deleteBusiness, selectBusinessForManagement } from '@/server/actions/business';
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
  const [isCreateBusinessOpen, setIsCreateBusinessOpen] = useState(false);
  const [isJoinBusinessOpen, setIsJoinBusinessOpen] = useState(false);

  const counts = useMemo(
    () => ({
      all: businesses.length,
      owned: businesses.filter((business) => business.relation === 'OWNER').length,
      staff: businesses.filter((business) => business.relation === 'STAFF').length,
      pending:
        businesses.filter((business) => business.relation === 'PENDING').length +
        businesses.reduce((total, business) => total + business.pendingJoinRequestCount, 0),
    }),
    [businesses],
  );

  const visibleBusinesses = useMemo(
    () =>
      businesses.filter((business) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'pending') {
          return business.relation === 'PENDING' || business.pendingJoinRequestCount > 0;
        }
        return business.relation === FILTER_RELATION[activeFilter];
      }),
    [businesses, activeFilter],
  );

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
      <PanelHero
        title={copy.myBusinesses.title}
        description={copy.myBusinesses.description}
        icon={BriefcaseBusiness}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => setIsCreateBusinessOpen(true)}
              className={`${actionButton} ${actionButtonLarge} shadow-lg`}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {copy.myBusinesses.openBusiness}
            </button>
            <button
              type="button"
              onClick={() => setIsJoinBusinessOpen(true)}
              className={`${actionButton} ${actionButtonLarge} shadow-lg`}
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
                  className={`${actionButton} ${actionButtonChip} ${selected ? actionButtonSelected : ''}`}
                >
                  {filter.label} <span className="ms-1 rounded-full bg-white/15 px-1.5 py-0.5 text-xs">{filter.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </PanelHero>

      <p className="text-sm font-semibold text-[var(--muted)]">
        {copy.myBusinesses.resultCount.replace('{count}', String(visibleBusinesses.length))}
      </p>

      {visibleBusinesses.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleBusinesses.map((business) => (
            <BusinessCard key={business.key} business={business} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title={businesses.length === 0 ? copy.myBusinesses.emptyTitle : copy.myBusinesses.noMatchesTitle}
          description={
            businesses.length === 0 ? copy.myBusinesses.emptyDescription : copy.myBusinesses.noMatchesDescription
          }
          // The relation filter is a tab strip that always shows its own "all" escape hatch, so
          // there is no separate clear button to offer here.
        />
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Three states: closed, asking for confirmation, or refused because upcoming appointments
  // exist. `delete_business()` (0034_fn_delete_business.sql) is the one thing that decides which
  // of the last two applies — this only routes its answer to the right dialog.
  const [deleteStage, setDeleteStage] = useState<'idle' | 'confirm' | 'blocked'>('idle');
  const [isDeleting, setIsDeleting] = useState(false);

  // `/businesses/manage/**` has no `businessId` in its URL and its layout cannot read one from a
  // search param either (Next.js layouts don't receive them), so this is how "which business" is
  // decided when more than one card can open it (§12.64). `selectBusinessForManagement` sets the
  // cookie `getCurrentEmployment()` reads; only after that resolves does navigation continue, so
  // the dashboard never renders mid-switch with the previous business still selected.
  function openManage() {
    startTransition(async () => {
      const result = await selectBusinessForManagement({ businessId: business.businessId });
      if (result.ok) {
        router.push(business.pendingJoinRequestCount > 0 ? '/businesses/manage/staff' : '/businesses/manage');
      }
    });
  }

  async function confirmDelete() {
    if (isDeleting) return;
    setIsDeleting(true);

    const result = await deleteBusiness({ businessId: business.businessId });

    setIsDeleting(false);

    if (result.ok) {
      toast.success(copy.myBusinesses.deleteSuccessToast);
      setDeleteStage('idle');
      router.refresh();
      return;
    }

    // `business_has_appointments` is the only UNPROCESSABLE this action can raise — it is refused,
    // not failed, so it gets the dedicated blocked dialog rather than a toast (§12.56's own
    // reasoning: an error is answered on the screen that raised it).
    if (result.error.code === 'UNPROCESSABLE') {
      setDeleteStage('blocked');
      return;
    }

    toast.error(result.error.message || copy.myBusinesses.deleteErrorGeneric);
  }

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
  const canManage = business.relation !== 'PENDING' && !isInactive;

  return (
    // `relative` + `cursor-pointer` only where there is a dashboard to open: the whole card is the
    // link's hit area then, exactly like a business on `/`. A pending or retired position lifts on
    // hover like its neighbours but keeps the arrow cursor — there is nothing behind it to open.
    <article
      className={`${surfaceCard} ${cardHoverLift} h-full gap-4 p-4 ${canManage ? 'relative cursor-pointer' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={cardTitle}>{business.name}</h3>
          {business.categoryName ? <p className={`mt-1 ${cardSubtitle}`}>{business.categoryName}</p> : null}
        </div>
        <span className={`${cardChip} ${relationStyle}`}>{relationLabel}</span>
      </div>

      <div className={cardMetaList}>
        <span className={`${cardMetaRow} items-start`}>
          <MapPin className={`mt-0.5 ${cardMetaIcon}`} aria-hidden="true" />
          {[business.address, business.area].filter(Boolean).join(', ')}
        </span>
        <span className={cardMetaRow}>
          <Users className={cardMetaIcon} aria-hidden="true" />
          {copy.myBusinesses.teamSize}: {business.employeeCount}
        </span>
        {business.positionTitle ? (
          <span className="flex items-center gap-2 font-semibold text-[var(--foreground)]">
            <BriefcaseBusiness className={cardMetaIcon} aria-hidden="true" />
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
        {business.pendingJoinRequestCount > 0 ? (
          <span className="flex items-center gap-2 text-amber-700">
            <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
            {copy.myBusinesses.pendingStaffRequests.replace(
              '{count}',
              String(business.pendingJoinRequestCount),
            )}
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-1">
        {canManage ? (
          <button
            type="button"
            onClick={openManage}
            disabled={isPending}
            // Same reasoning as the discovery card: several cards carry this identical label, so the
            // accessible name has to name the business. The stretched `::after` is what gives the
            // pointer cursor something real underneath it over the whole card.
            aria-label={[
              business.pendingJoinRequestCount > 0 ? copy.myBusinesses.manageRequests : copy.myBusinesses.manage,
              business.name,
            ].join(' — ')}
            className={`${actionButton} ${cardAction} ${cardStretchedLink}`}
          >
            {business.pendingJoinRequestCount > 0 ? copy.myBusinesses.manageRequests : copy.myBusinesses.manage}
          </button>
        ) : null}
        {business.relation === 'OWNER' ? (
          <button
            type="button"
            onClick={() => setDeleteStage('confirm')}
            // `relative z-10`, not just `relative`: the manage button's `cardStretchedLink` (above)
            // stretches an invisible `::after` over the *whole* card via `position: absolute`, which
            // paints above any plain in-flow sibling regardless of DOM order (§12.59's card-styles
            // note documents the same gotcha the other way round). An explicit z-index — not merely
            // `relative`'s z-index:auto — is what reliably keeps this button clickable over it.
            aria-label={[copy.myBusinesses.deleteBusiness, business.name].join(' — ')}
            className={`${actionButton} ${cardAction} relative z-10`}
          >
            {copy.myBusinesses.deleteBusiness}
          </button>
        ) : null}
      </div>

      {deleteStage === 'confirm' ? (
        <ConfirmDialog
          title={copy.myBusinesses.deleteConfirmTitle}
          description={copy.myBusinesses.deleteConfirmDescription.replace('{name}', business.name)}
          confirmLabel={copy.myBusinesses.deleteConfirmYes}
          cancelLabel={copy.myBusinesses.deleteConfirmNo}
          closeLabel={copy.common.close}
          pending={isDeleting}
          pendingLabel={copy.myBusinesses.deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteStage('idle')}
        />
      ) : null}

      {deleteStage === 'blocked' ? (
        <ErrorDialog
          title={copy.myBusinesses.deleteBlockedTitle}
          description={copy.myBusinesses.deleteBlockedDescription}
          onClose={() => setDeleteStage('idle')}
        />
      ) : null}
    </article>
  );
}
