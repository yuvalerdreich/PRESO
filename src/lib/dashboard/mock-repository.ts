import type { DashboardRepository } from '@/lib/dashboard/repository';

const business = { id: 'studio-zohar', name: { he: 'מספרת זוהר - Studio Zohar', en: 'Studio Zohar' }, category: { he: 'מספרות ומכוני יופי', en: 'Hair & beauty' }, area: { he: 'תל אביב', en: 'Tel Aviv' }, address: { he: 'רחוב דיזנגוף 142, תל אביב', en: '142 Dizengoff Street, Tel Aviv' }, phone: '03-6001122' } as const;
const employees = [
  { id: 'zohar', name: { he: 'זוהר לוי', en: 'Zohar Levi' }, position: { he: 'מעצבת שיער', en: 'Hair stylist' } },
  { id: 'noa', name: { he: 'נועה גולן', en: 'Noa Golan' }, position: { he: 'צבע וטיפולי שיער', en: 'Colour and hair care' } },
] as const;
const appointments = [
  { id: 'dashboard-1', dateKey: '2026-08-18', clientName: { he: 'יובל אדריך', en: 'Yuval Erdrich' }, clientContact: '054-1112233', employeeId: 'zohar', employeeName: employees[0].name, serviceName: { he: 'תספורת ועיצוב שיער', en: 'Haircut and styling' }, time: '10:00 – 10:30', status: 'confirmed' },
  { id: 'dashboard-2', dateKey: '2026-08-18', clientName: { he: 'נועה גולן', en: 'Noa Golan' }, clientContact: '052-3334455', employeeId: 'noa', employeeName: employees[1].name, serviceName: { he: 'גוונים וצבע אומברי', en: 'Highlights and ombré colour' }, time: '11:00 – 12:30', status: 'pending' },
  { id: 'dashboard-3', dateKey: '2026-08-19', clientName: { he: 'מיה רז', en: 'Mia Raz' }, clientContact: '050-8882211', employeeId: 'zohar', employeeName: employees[0].name, serviceName: { he: 'חידוש צבע', en: 'Colour refresh' }, time: '14:00 – 15:30', status: 'confirmed' },
] as const;
const kpis = [
  { id: 'appointments', value: '4', isMock: true }, { id: 'staff', value: '2', isMock: true }, { id: 'pending', value: '1', isMock: true }, { id: 'revenue', value: '₪1,000', isMock: true },
] as const;

export const mockDashboardRepository: DashboardRepository = {
  async getCurrentBusinessDashboard() { return business; },
  async listDashboardEmployees() { return [...employees]; },
  async listDashboardAppointments() { return [...appointments]; },
  async listDashboardKpis() { return [...kpis]; },
};
