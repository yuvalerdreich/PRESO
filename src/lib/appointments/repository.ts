import { mockAppointmentsRepository } from '@/lib/appointments/mock-repository';
import type { ClientAppointment, ClientWaitlistEntry } from '@/types/appointments';

/**
 * A future implementation will derive the client from the authenticated
 * session and read RLS-scoped appointment data. This mock contract stays
 * read-only: local UI demo state must never be confused with persistence.
 */
export type AppointmentsRepository = {
  listCurrentClientAppointments(): Promise<ClientAppointment[]>;
  listCurrentClientWaitlistEntries(): Promise<ClientWaitlistEntry[]>;
};

export const appointmentsRepository: AppointmentsRepository = mockAppointmentsRepository;
