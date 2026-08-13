'use client';

import { useLanguage } from '@/lib/i18n/language-provider';

export function EmptyState({ onClear }: { onClear?: () => void }) {
  const { copy } = useLanguage();

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--line)] px-6 py-16 text-center">
      <p className="text-base font-semibold text-[var(--foreground)]">{copy.emptyState.title}</p>
      <p className="text-sm text-[var(--muted)]">{copy.emptyState.description}</p>
      {onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="text-sm font-medium text-[var(--brand)] underline-offset-4 hover:underline"
        >
          {copy.emptyState.clearFilters}
        </button>
      ) : null}
    </div>
  );
}
