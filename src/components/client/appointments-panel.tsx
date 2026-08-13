import type { ClientAppointment, ClientWaitlistEntry } from '@/types/appointments';

/** Typecheck-only placeholder — the real appointments panel isn't built yet (CLAUDE.md §8). */
export function AppointmentsPanel({
  appointments,
  waitlistEntries,
}: {
  appointments: ClientAppointment[];
  waitlistEntries: ClientWaitlistEntry[];
}) {
  return (
    <div data-testid="appointments-panel-placeholder">
      {appointments.length} appointments, {waitlistEntries.length} waitlist entries — not yet implemented.
    </div>
  );
}
