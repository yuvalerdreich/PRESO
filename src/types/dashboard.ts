import type { LocalizedText } from '@/types/domain';
import type { AppointmentStatus } from '@/types/appointments';

export type DashboardBusiness = {
  id: string;
  name: LocalizedText;
  category: LocalizedText;
  area: LocalizedText;
  address: LocalizedText;
  phone: string;
};

export type DashboardEmployee = { id: string; name: LocalizedText; position: LocalizedText };

export type DashboardAppointment = {
  id: string;
  dateKey: string;
  clientName: LocalizedText;
  clientContact: string;
  employeeId: string;
  employeeName: LocalizedText;
  serviceName: LocalizedText;
  time: string;
  status: AppointmentStatus;
};

export type DashboardKpi = { id: 'appointments' | 'staff' | 'pending' | 'revenue'; value: string; isMock: true };
