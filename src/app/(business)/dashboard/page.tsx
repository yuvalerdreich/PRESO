import { DashboardOverview } from '@/components/business/dashboard-overview';
import { dashboardRepository } from '@/lib/dashboard/repository';
export default async function DashboardRoute() { const [business, kpis, appointments] = await Promise.all([dashboardRepository.getCurrentBusinessDashboard(), dashboardRepository.listDashboardKpis(), dashboardRepository.listDashboardAppointments()]); return <DashboardOverview business={business} kpis={kpis} appointments={appointments} />; }
