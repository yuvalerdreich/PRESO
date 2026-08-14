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
  /** Looked up by id alone — what `POST /api/appointments` has to resolve from `employeeId`. */
  getEmployeeById(employeeId: string): Promise<EmployeeSummary | null>;
  /** Looked up by id alone — what `POST /api/appointments` has to resolve from `serviceId`. */
  getServiceById(serviceId: string): Promise<ServiceSummary | null>;
  /** ISO (YYYY-MM-DD) dates with at least one slot in that month. Mock stand-in for `get_available_slots()` — see mock-repository.ts. */
  getMonthAvailability(employeeId: string, serviceId: string, monthISO: string): Promise<string[]>;
  /** "HH:mm" start times for one date; empty when closed. */
  getDaySlots(employeeId: string, serviceId: string, dateISO: string): Promise<string[]>;
};

// Swap this for a real @supabase/ssr-backed implementation once the schema exists (CLAUDE.md §8).
export const discoveryRepository: DiscoveryRepository = mockDiscoveryRepository;
