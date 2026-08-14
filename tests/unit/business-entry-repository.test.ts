import { describe, expect, it } from 'vitest';

import { businessEntryRepository } from '@/lib/business-entry/repository';

// Skipped: lib/business-entry/repository.ts is a typecheck-only placeholder (CLAUDE.md §8).
// Remove .skip once the real business-entry read model is implemented.
describe.skip('mock business-entry repository', () => {
  it('provides only categories, areas, and businesses to join', async () => {
    await expect(businessEntryRepository.listCategories()).resolves.toHaveLength(3);
    await expect(businessEntryRepository.listAreas()).resolves.toHaveLength(3);
    await expect(businessEntryRepository.listJoinableBusinesses()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'join-studio-zohar' })]),
    );
  });
});
