'use client';

import { useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';

import { BusinessCard } from '@/components/public/business-card';
import { CategoryChips } from '@/components/public/category-chips';
import { EmptyState } from '@/components/common/empty-state';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { BusinessSummary, Category } from '@/types/domain';

export function BusinessResults({
  businesses,
  categories,
  searchApplied = false,
}: {
  businesses: BusinessSummary[];
  categories: Category[];
  /**
   * True when the rows already went through a `q`/`area` filter on the server (`/search`). It is
   * the difference between "nothing exists" and "nothing matched": with no query and no chip, an
   * empty grid means the platform has no active businesses yet.
   */
  searchApplied?: boolean;
}) {
  const { copy } = useLanguage();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const filtered = useMemo(
    () => (selectedCategoryId ? businesses.filter((business) => business.categoryId === selectedCategoryId) : businesses),
    [businesses, selectedCategoryId],
  );

  const filteredSomething = searchApplied || selectedCategoryId !== null;

  return (
    <section className="flex flex-col gap-6">
      <CategoryChips categories={categories} selectedCategoryId={selectedCategoryId} onSelect={setSelectedCategoryId} />

      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-[var(--foreground)]">{copy.discovery.featuredTitle}</h2>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--soft-violet)] text-xs font-semibold text-[var(--brand-deep)]">
          {filtered.length}
        </span>
      </div>

      {/* Four across on a wide screen, not three: the cards carry a photo, a description and a
          meta row, and at 1/3 of a 1280px page each one reads as a poster rather than a listing. */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((business) => (
            <BusinessCard key={business.id} business={business} category={categoryById.get(business.categoryId)} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title={filteredSomething ? copy.emptyState.noMatchesTitle : copy.emptyState.title}
          description={filteredSomething ? copy.emptyState.noMatchesDescription : copy.emptyState.description}
          // Only offered when there is a filter this button can actually clear — the category chip.
          // A `q`/`area` search lives in the URL and is cleared by editing the form above.
          onClear={selectedCategoryId !== null ? () => setSelectedCategoryId(null) : undefined}
        />
      )}
    </section>
  );
}
