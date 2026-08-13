import type {
  BusinessProfile,
  BusinessSearchFilters,
  BusinessSummary,
  Category,
  EmployeeSummary,
  ServiceSummary,
} from '@/types/domain';

import { mockDiscoveryRepository } from '@/lib/discovery/mock-repository';

export type DiscoveryRepository = {
  listCategories(): Promise<Category[]>;
  searchBusinesses(filters?: BusinessSearchFilters): Promise<BusinessSummary[]>;
  getBusinessProfile(businessId: string): Promise<BusinessProfile | null>;
  listBusinessEmployees(businessId: string): Promise<EmployeeSummary[]>;
  getBusinessEmployee(businessId: string, employeeId: string): Promise<EmployeeSummary | null>;
  listEmployeeServices(businessId: string, employeeId: string): Promise<ServiceSummary[]>;
};

// Swap this for a real @supabase/ssr-backed implementation once the schema exists (CLAUDE.md §8).
export const discoveryRepository: DiscoveryRepository = mockDiscoveryRepository;
