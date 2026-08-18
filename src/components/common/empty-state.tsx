'use client';

import { useLanguage } from '@/lib/i18n/language-provider';

/**
 * Two different nothings share this box, and the words have to tell them apart: an empty database
 * ("no active businesses yet" — the default copy) versus a query that excluded everything
 * ("no businesses match that search"), which the caller passes in. Saying the first when the
 * second is true reads as a broken app.
 */
export function EmptyState({
  title,
  description,
  onClear,
}: {
  title?: string;
  description?: string;
  onClear?: () => void;
}) {
  const { copy } = useLanguage();

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--line)] px-6 py-16 text-center">
      <p className="text-base font-semibold text-[var(--foreground)]">{title ?? copy.emptyState.title}</p>
      <p className="text-sm text-[var(--muted)]">{description ?? copy.emptyState.description}</p>
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
