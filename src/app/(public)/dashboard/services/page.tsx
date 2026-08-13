import { DashboardServicesPage } from '@/components/dashboard/dashboard-services-page';
import { dashboardRepository } from '@/lib/dashboard/repository';

export default async function DashboardServicesRoute() {
  const [business, employees, services] = await Promise.all([dashboardRepository.getCurrentBusinessDashboard(), dashboardRepository.listDashboardEmployees(), dashboardRepository.listDashboardServices()]);
  return <DashboardServicesPage business={business} employees={employees} services={services} />;
}
