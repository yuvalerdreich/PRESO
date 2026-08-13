import type { ClientAppointment, ClientWaitlistEntry } from '@/types/appointments';

/**
 * Typecheck-only placeholder — unblocks `tsc` and the module graph. The real
 * client appointments read model isn't built yet (CLAUDE.md §8); behavior
 * here is intentionally empty, not a working implementation.
 */
export const appointmentsRepository = {
  async listCurrentClientAppointments(): Promise<ClientAppointment[]> {
    return [];
  },
  async listCurrentClientWaitlistEntries(): Promise<ClientWaitlistEntry[]> {
    return [];
  },
};
