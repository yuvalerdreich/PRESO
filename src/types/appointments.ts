import type { LocalizedText } from '@/types/domain';

export type AppointmentStatus = 'confirmed' | 'pending' | 'cancelled';

export type ClientAppointment = {
  id: string;
  businessName: LocalizedText;
  employeeName: LocalizedText;
  serviceName: LocalizedText;
  address: LocalizedText;
  /** ISO date (YYYY-MM-DD) of the slot. Past dates fall into the history tab regardless of status. */
  dateISO: string;
  /** "HH:mm" start time. */
  time: string;
  status: AppointmentStatus;
};

export type ClientWaitlistEntry = {
  id: string;
  businessName: LocalizedText;
  employeeName: LocalizedText;
  serviceName: LocalizedText;
  requestedDateISO: string;
  requestedRange: string;
};

/** Everything needed to create a `ClientAppointment` row, minus its generated `id`. */
export type CreateAppointmentInput = Omit<ClientAppointment, 'id'>;
