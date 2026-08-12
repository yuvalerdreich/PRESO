import type {
  BusinessEmployee,
  BusinessProfile,
  DiscoveryArea,
  DiscoveryBusiness,
  DiscoveryCategory,
  EmployeeService,
} from '@/types/domain';

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
  getBusinessProfile(businessId: string): Promise<BusinessProfile | null>;
  listBusinessEmployees(businessId: string): Promise<BusinessEmployee[]>;
  getBusinessEmployee(businessId: string, employeeId: string): Promise<BusinessEmployee | null>;
  listEmployeeServices(businessId: string, employeeId: string): Promise<EmployeeService[]>;
};

export const discoveryRepository: DiscoveryRepository = mockDiscoveryRepository;
