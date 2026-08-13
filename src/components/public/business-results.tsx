'use client';

import { useMemo, useState } from 'react';

import { BusinessCard } from '@/components/public/business-card';
import { CategoryChips } from '@/components/public/category-chips';
import { EmptyState } from '@/components/common/empty-state';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { BusinessSummary, Category } from '@/types/domain';

export function BusinessResults({
  businesses,
  categories,
}: {
  businesses: BusinessSummary[];
  categories: Category[];
}) {
  const { copy } = useLanguage();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const filtered = useMemo(
    () => (selectedCategoryId ? businesses.filter((business) => business.categoryId === selectedCategoryId) : businesses),
    [businesses, selectedCategoryId],
  );

  return (
    <section className="flex flex-col gap-6">
      <CategoryChips categories={categories} selectedCategoryId={selectedCategoryId} onSelect={setSelectedCategoryId} />

      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold text-[var(--foreground)]">{copy.discovery.featuredTitle}</h2>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--soft-violet)] text-xs font-semibold text-[var(--brand-deep)]">
          {filtered.length}
        </span>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((business) => (
            <BusinessCard key={business.id} business={business} category={categoryById.get(business.categoryId)} />
          ))}
        </div>
      ) : (
        <EmptyState onClear={() => setSelectedCategoryId(null)} />
      )}
    </section>
  );
}
