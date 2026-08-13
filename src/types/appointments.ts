import type { LocalizedText } from '@/types/domain';

export type AppointmentStatus = 'confirmed' | 'pending' | 'cancelled';
export type AppointmentPeriod = 'upcoming' | 'history';

export type ClientAppointment = {
  id: string;
  period: AppointmentPeriod;
  status: AppointmentStatus;
  businessName: LocalizedText;
  employeeName: LocalizedText;
  serviceName: LocalizedText;
  address: LocalizedText;
  date: LocalizedText;
  time: string;
};

export type ClientWaitlistEntry = {
  id: string;
  businessName: LocalizedText;
  serviceName: LocalizedText;
  employeeName: LocalizedText;
  requestedRange: LocalizedText;
};
