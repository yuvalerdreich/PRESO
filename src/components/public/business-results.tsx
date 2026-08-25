'use client';

import { Building2 } from 'lucide-react';

import { actionButton, actionButtonChip } from '@/components/common/button-styles';
import { EmptyState } from '@/components/common/empty-state';
import { BusinessCard } from '@/components/public/business-card';
import { CategoryChips } from '@/components/public/category-chips';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { BusinessSearchResultItem, Category } from '@/types/domain';

export function BusinessResults({
  businesses,
  total,
  categories,
  selectedCategoryId,
  onSelectCategory,
  searchApplied = false,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: {
  /** Every page fetched so far, flattened — not the whole matching set (§5.2's pagination). */
  businesses: BusinessSearchResultItem[];
  /** The server-computed total across every page, for the count badge and the empty-state check. */
  total: number;
  categories: Category[];
  /** Lifted to `DiscoveryBrowser` — category is now part of the same server-side filter as `q`/`area`. */
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  /**
   * True when the rows already went through a `q`/`area`/category filter. It is the difference
   * between "nothing exists" and "nothing matched": with no filter active, an empty grid means the
   * platform has no active businesses yet.
   */
  searchApplied?: boolean;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}) {
  const { copy } = useLanguage();
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  return (
    <section className="flex flex-col gap-6">
      <CategoryChips categories={categories} selectedCategoryId={selectedCategoryId} onSelect={onSelectCategory} />

      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-[var(--foreground)]">{copy.discovery.featuredTitle}</h2>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--soft-violet)] text-xs font-semibold text-[var(--brand-deep)]">
          {total}
        </span>
      </div>

      {/* Four across on a wide screen, not three: the cards carry a photo, a description and a
          meta row, and at 1/3 of a 1280px page each one reads as a poster rather than a listing. */}
      {businesses.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {businesses.map((business) => (
              <BusinessCard key={business.id} business={business} category={categoryById.get(business.categoryId)} />
            ))}
          </div>

          {hasMore ? (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className={`${actionButton} ${actionButtonChip} mx-auto`}
            >
              {isLoadingMore ? copy.discovery.loadingMore : copy.discovery.loadMore}
            </button>
          ) : null}
        </>
      ) : (
        <EmptyState
          icon={Building2}
          title={searchApplied ? copy.emptyState.noMatchesTitle : copy.emptyState.title}
          description={searchApplied ? copy.emptyState.noMatchesDescription : copy.emptyState.description}
          // Only offered when there is a filter this button can actually clear — the category chip.
          // A `q`/`area` search lives in the search form above and is cleared by editing it.
          onClear={selectedCategoryId !== null ? () => onSelectCategory(null) : undefined}
        />
      )}
    </section>
  );
}
