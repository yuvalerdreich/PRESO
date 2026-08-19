'use client';

import type { LucideIcon } from 'lucide-react';

import { surfaceCard } from '@/components/common/card-styles';
import { useLanguage } from '@/lib/i18n/language-provider';

/**
 * Two different nothings share this box, and the words have to tell them apart: an empty database
 * ("no active businesses yet" — the default copy) versus a query that excluded everything
 * ("no businesses match that search"), which the caller passes in. Saying the first when the
 * second is true reads as a broken app.
 *
 * One box, every screen: `/businesses` used to carry its own hand-rolled version of this, so the
 * same message arrived in a white card there and a dashed outline on the home grid. It sits on the
 * shared card surface now, which is also what the results it replaces would have looked like.
 */
export function EmptyState({
  title,
  description,
  icon: Icon,
  onClear,
}: {
  title?: string;
  description?: string;
  /** The subject of the missing list — a building for businesses, a calendar for appointments. */
  icon?: LucideIcon;
  onClear?: () => void;
}) {
  const { copy } = useLanguage();

  return (
    <div className={`${surfaceCard} items-center gap-3 px-6 py-14 text-center`}>
      {Icon ? (
        <span className="mb-2 flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--soft-violet)] text-[var(--brand)]">
          <Icon className="h-8 w-8" aria-hidden="true" />
        </span>
      ) : null}
      <h2 className="text-lg font-extrabold text-[var(--foreground)]">{title ?? copy.emptyState.title}</h2>
      <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
        {description ?? copy.emptyState.description}
      </p>
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-[var(--brand-blue-dark)] underline-offset-4 transition-colors hover:text-[var(--brand-blue)] hover:underline"
        >
          {copy.emptyState.clearFilters}
        </button>
      ) : null}
    </div>
  );
}
