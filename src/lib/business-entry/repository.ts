import { mockBusinessEntryRepository } from '@/lib/business-entry/mock-repository';
import type { BusinessEntryArea, BusinessEntryCategory, JoinableBusiness } from '@/types/business-entry';

/**
 * This intentionally exposes only lookup data. Future server actions handle
 * business creation and join requests; local form states never represent a
 * persisted write.
 */
export type BusinessEntryRepository = {
  listCategories(): Promise<BusinessEntryCategory[]>;
  listAreas(): Promise<BusinessEntryArea[]>;
  listJoinableBusinesses(): Promise<JoinableBusiness[]>;
};

export const businessEntryRepository: BusinessEntryRepository = mockBusinessEntryRepository;
