import type { BusinessArea, BusinessCategory, JoinableBusiness } from '@/types/business-entry';

/**
 * Typecheck-only placeholder — unblocks `tsc` and the module graph. The real
 * business-entry read model isn't built yet (CLAUDE.md §8); behavior here is
 * intentionally empty, not a working implementation.
 */
export const businessEntryRepository = {
  async listCategories(): Promise<BusinessCategory[]> {
    return [];
  },
  async listAreas(): Promise<BusinessArea[]> {
    return [];
  },
  async listJoinableBusinesses(): Promise<JoinableBusiness[]> {
    return [];
  },
};
