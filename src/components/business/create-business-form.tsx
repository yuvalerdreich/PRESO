import type { BusinessArea, BusinessCategory } from '@/types/business-entry';

/** Typecheck-only placeholder — the real create-business form isn't built yet (CLAUDE.md §8). */
export function CreateBusinessForm({
  categories,
  areas,
  onComplete,
}: {
  categories: BusinessCategory[];
  areas: BusinessArea[];
  onComplete: () => void;
}) {
  return (
    <button type="button" onClick={onComplete} data-testid="create-business-form-placeholder">
      {categories.length} categories, {areas.length} areas — form not yet implemented.
    </button>
  );
}
