import type { JoinableBusiness } from '@/types/domain';

/** Typecheck-only placeholder — the real join-business form isn't built yet (CLAUDE.md §8). */
export function JoinBusinessForm({ businesses }: { businesses: JoinableBusiness[] }) {
  return (
    <div data-testid="join-business-form-placeholder">
      {businesses.length} joinable businesses — form not yet implemented.
    </div>
  );
}
