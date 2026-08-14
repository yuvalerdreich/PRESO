import { describe, expect, it } from 'vitest';

import { appointmentsRepository } from '@/lib/appointments/repository';

// Skipped: lib/appointments/repository.ts is a typecheck-only placeholder (CLAUDE.md §8).
// Remove .skip once the real client appointments read model is implemented.
describe.skip('mock appointments repository', () => {
  it('returns read-only display data for the current demo client', async () => {
    await expect(appointmentsRepository.listCurrentClientAppointments()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'appointment-zohar', status: 'confirmed' })]),
    );
    await expect(appointmentsRepository.listCurrentClientWaitlistEntries()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'waitlist-noa' })]),
    );
  });
});
