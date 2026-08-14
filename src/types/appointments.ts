export type AppointmentStatus = 'confirmed' | 'pending' | 'cancelled';

export type ClientAppointment = {
  id: string;
  businessName: string;
  employeeName: string;
  serviceName: string;
  address: string;
  /** ISO date (YYYY-MM-DD) of the slot. Past dates fall into the history tab regardless of status. */
  dateISO: string;
  /** "HH:mm" start time. */
  time: string;
  status: AppointmentStatus;
};

export type ClientWaitlistEntry = {
  id: string;
  businessName: string;
  employeeName: string;
  serviceName: string;
  requestedDateISO: string;
  requestedRange: string;
};
