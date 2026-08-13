import { mockDashboardRepository } from '@/lib/dashboard/mock-repository';
import type { DashboardAppointment, DashboardBusiness, DashboardEmployee, DashboardKpi, DashboardService } from '@/types/dashboard';

/** Public UI mock data only. Future RLS-scoped reads replace this contract. */
export type DashboardRepository = {
  getCurrentBusinessDashboard(): Promise<DashboardBusiness>;
  listDashboardEmployees(): Promise<DashboardEmployee[]>;
  listDashboardAppointments(): Promise<DashboardAppointment[]>;
  listDashboardKpis(): Promise<DashboardKpi[]>;
  listDashboardServices(): Promise<DashboardService[]>;
};

export const dashboardRepository: DashboardRepository = mockDashboardRepository;
