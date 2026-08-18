import type { ClientAppointment } from '@/types/domain';

function todayISO(): string {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * An appointment is "upcoming" only while it is neither cancelled nor in the
 * past — waitlist entries and completed/past appointments never count here.
 * `demoCancelledIds` covers appointments cancelled client-side during this
 * session (see AppointmentsPanel), which don't carry status: 'CANCELLED'.
 */
export function isUpcomingAppointment(
  appointment: ClientAppointment,
  demoCancelledIds?: ReadonlySet<string>,
): boolean {
  if (appointment.status === 'CANCELLED' || demoCancelledIds?.has(appointment.id)) return false;
  return appointment.dateISO >= todayISO();
}

export function countUpcomingAppointments(appointments: ClientAppointment[]): number {
  return appointments.filter((appointment) => isUpcomingAppointment(appointment)).length;
}
