import type { ClientAppointment } from '@/types/domain';

function todayISO(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * An appointment is "upcoming" only while it is neither cancelled nor in the
 * past — waitlist entries and completed/past appointments never count here.
 *
 * Status is read straight off the row: cancelling goes through
 * `PATCH /api/appointments/[id]` and `router.refresh()`, so the server's
 * `status = 'CANCELLED'` is the only thing that moves a row into History.
 * (There used to be a `demoCancelledIds` override here for the client-side-only
 * cancel this panel did before the RPC was wired in.)
 */
export function isUpcomingAppointment(appointment: ClientAppointment): boolean {
  if (appointment.status === 'CANCELLED') return false;
  return appointment.dateISO >= todayISO();
}

export function countUpcomingAppointments(appointments: ClientAppointment[]): number {
  return appointments.filter((appointment) => isUpcomingAppointment(appointment)).length;
}
