import { DashboardStaffPage } from '@/components/dashboard/dashboard-staff-page';
import { dashboardRepository } from '@/lib/dashboard/repository';

export default async function DashboardStaffRoute() {
  const [business, employees, services] = await Promise.all([dashboardRepository.getCurrentBusinessDashboard(), dashboardRepository.listDashboardEmployees(), dashboardRepository.listDashboardServices()]);
  return <DashboardStaffPage business={business} employees={employees} services={services} />;
}
