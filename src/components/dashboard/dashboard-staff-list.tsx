'use client';

import { DashboardStaffCard } from '@/components/dashboard/dashboard-staff-card';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { DashboardEmployee, DashboardService } from '@/types/dashboard';

export function DashboardStaffList({ employees, services, onViewDetails }: { employees: DashboardEmployee[]; services: DashboardService[]; onViewDetails: (employee: DashboardEmployee) => void }) {
  const { copy } = useLanguage();
  if (!employees.length) return <p className="rounded-[1.5rem] border border-dashed border-violet-200 bg-violet-50/55 p-8 text-center text-sm font-semibold text-[var(--muted)]">{copy.dashboard.noStaff}</p>;
  return <div className="grid gap-4 lg:grid-cols-2">{employees.map((employee) => <DashboardStaffCard key={employee.id} employee={employee} services={services.filter((service) => service.employeeId === employee.id)} onViewDetails={() => onViewDetails(employee)} />)}</div>;
}
