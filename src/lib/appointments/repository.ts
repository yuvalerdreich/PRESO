import type { ClientAppointment, ClientWaitlistEntry } from '@/types/appointments';

import { mockAppointmentsRepository } from '@/lib/appointments/mock-repository';

export type AppointmentsRepository = {
  listCurrentClientAppointments(): Promise<ClientAppointment[]>;
  listCurrentClientWaitlistEntries(): Promise<ClientWaitlistEntry[]>;
};

// Swap this for a real @supabase/ssr-backed implementation once the schema exists (CLAUDE.md §8).
export const appointmentsRepository: AppointmentsRepository = mockAppointmentsRepository;
