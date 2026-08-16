import type {
  DashboardAppointment,
  DashboardBusiness,
  DashboardEmployee,
  DashboardKpi,
  DashboardService,
} from '@/types/domain';

/**
 * Typecheck-only placeholder — unblocks `tsc` and the module graph. The real
 * business dashboard read model isn't built yet (CLAUDE.md §8); behavior here
 * is intentionally empty, not a working implementation.
 */
export const dashboardRepository = {
  async getCurrentBusinessDashboard(): Promise<DashboardBusiness> {
    return {
      id: 'studio-zohar',
      name: 'Studio Zohar',
      timezone: 'Asia/Jerusalem',
      approvalPolicy: 'AUTO',
      cancellationWindowHours: 24,
      status: 'ACTIVE',
      isOwner: true,
    };
  },
  async listDashboardEmployees(): Promise<DashboardEmployee[]> {
    return [];
  },
  async listDashboardServices(): Promise<DashboardService[]> {
    return [];
  },
  async listDashboardAppointments(): Promise<DashboardAppointment[]> {
    return [];
  },
  async listDashboardKpis(): Promise<DashboardKpi[]> {
    return [];
  },
};
