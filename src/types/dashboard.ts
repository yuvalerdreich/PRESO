/** Typecheck-only placeholder shape — the real business dashboard model isn't built yet. */
export type DashboardBusiness = { id: string } & Record<string, unknown>;
export type DashboardEmployee = { id: string } & Record<string, unknown>;
export type DashboardService = { id: string; employeeId: string } & Record<string, unknown>;
export type DashboardAppointment = { id: string } & Record<string, unknown>;
export type DashboardKpi = { id: string; isMock?: boolean } & Record<string, unknown>;
