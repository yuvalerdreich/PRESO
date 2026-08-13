'use client';

import { useState } from 'react';

import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { DashboardStaffList } from '@/components/dashboard/dashboard-staff-list';
import { EmployeeDetailsModal } from '@/components/dashboard/employee-details-modal';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { DashboardBusiness, DashboardEmployee, DashboardService } from '@/types/dashboard';

export function DashboardStaffPage({ business, employees, services }: { business: DashboardBusiness; employees: DashboardEmployee[]; services: DashboardService[] }) {
  const { copy } = useLanguage();
  const [selectedEmployee, setSelectedEmployee] = useState<DashboardEmployee | null>(null);
  const selectedServices = selectedEmployee ? services.filter((service) => service.employeeId === selectedEmployee.id) : [];
  return <DashboardShell business={business} active="staff"><section className="mt-7"><p className="text-sm font-bold text-[var(--brand)]">{copy.dashboard.staff}</p><h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{copy.dashboard.staffTitle}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{copy.dashboard.staffDescription}</p><div className="mt-6"><DashboardStaffList employees={employees} services={services} onViewDetails={setSelectedEmployee} /></div></section><EmployeeDetailsModal employee={selectedEmployee} services={selectedServices} onClose={() => setSelectedEmployee(null)} /></DashboardShell>;
}
