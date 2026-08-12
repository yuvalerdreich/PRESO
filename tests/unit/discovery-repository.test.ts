import { describe, expect, it } from 'vitest';

import { discoveryRepository } from '@/lib/discovery/repository';

describe('mock discovery repository', () => {
  it('filters local businesses by query, category, and area', async () => {
    await expect(discoveryRepository.searchBusinesses({ q: 'Glow' })).resolves.toMatchObject([
      { id: 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1002' },
    ]);
    await expect(discoveryRepository.searchBusinesses({ category: 'fitness' })).resolves.toHaveLength(1);
    await expect(discoveryRepository.searchBusinesses({ area: 'tel-aviv' })).resolves.toHaveLength(1);
  });

  it('returns no result for unmatched filters', async () => {
    await expect(discoveryRepository.searchBusinesses({ q: 'unmatched business' })).resolves.toEqual([]);
  });
});
