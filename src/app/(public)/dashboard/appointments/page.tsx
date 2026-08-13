import { DashboardAppointmentsPage } from '@/components/dashboard/dashboard-appointments-page';
import { dashboardRepository } from '@/lib/dashboard/repository';
export default async function DashboardAppointmentsRoute() { const [business, employees, appointments] = await Promise.all([dashboardRepository.getCurrentBusinessDashboard(), dashboardRepository.listDashboardEmployees(), dashboardRepository.listDashboardAppointments()]); return <DashboardAppointmentsPage business={business} employees={employees} appointments={appointments} />; }
