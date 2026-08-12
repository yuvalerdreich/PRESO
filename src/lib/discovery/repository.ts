import type { DiscoveryArea, DiscoveryBusiness, DiscoveryCategory } from '@/types/domain';

import { mockDiscoveryRepository } from '@/lib/discovery/mock-repository';

export type DiscoveryFilters = {
  q?: string;
  category?: string;
  area?: string;
};

/**
 * Public pages depend on this contract rather than fixture arrays. A later
 * Supabase/API implementation can replace the mock without rewriting the UI.
 */
export type DiscoveryRepository = {
  listCategories(): Promise<DiscoveryCategory[]>;
  listAreas(): Promise<DiscoveryArea[]>;
  searchBusinesses(filters: DiscoveryFilters): Promise<DiscoveryBusiness[]>;
};

export const discoveryRepository: DiscoveryRepository = mockDiscoveryRepository;
