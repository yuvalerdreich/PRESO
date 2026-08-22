'use client';

import { Calendar, CalendarClock, Clock, MapPin, XCircle } from 'lucide-react';

import { AppointmentStatusBadge } from '@/components/common/appointment-status-badge';
import { actionButton } from '@/components/common/button-styles';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { ClientAppointment } from '@/types/domain';

export function AppointmentCard({
  appointment,
  onCancel,
  onReschedule,
}: {
  appointment: ClientAppointment;
  onCancel?: () => void;
  onReschedule?: () => void;
}) {
  const { copy } = useLanguage();

  return (
    <article className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white shadow-[0_16px_35px_-28px_rgba(23,27,70,0.55)]">
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-base font-bold text-[var(--foreground)]">
              {copy.appointments.serviceWith} {appointment.employeeName}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--brand)]">{appointment.businessName}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{appointment.serviceName}</p>
          </div>
          <AppointmentStatusBadge status={appointment.status} />
        </div>

        <div className="grid gap-3 rounded-2xl border border-[var(--line)] bg-slate-50/70 p-4 text-sm sm:grid-cols-2">
          <span className="flex items-center gap-2 font-semibold text-[var(--foreground)]">
            <Calendar className="h-4 w-4 text-[var(--brand)]" aria-hidden="true" />
            {copy.appointments.appointmentAt} {appointment.dateISO}
          </span>
          <span className="flex items-center gap-2 font-semibold text-[var(--foreground)]">
            <Clock className="h-4 w-4 text-[var(--brand)]" aria-hidden="true" />
            {appointment.time}
          </span>
          <span className="flex items-start gap-2 text-[var(--muted)] sm:col-span-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
            {appointment.address}
          </span>
        </div>
      </div>

      {onCancel || onReschedule ? (
        <div className="flex flex-wrap justify-end gap-3 border-t border-[var(--line)] px-5 py-4 sm:px-6">
          {onReschedule ? (
            <button
              type="button"
              onClick={onReschedule}
              className={`${actionButton} rounded-full px-4 py-2 text-sm`}
            >
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              {copy.appointments.reschedule}
            </button>
          ) : null}
          {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className={`${actionButton} rounded-full px-4 py-2 text-sm`}
          >
            <XCircle className="h-4 w-4" aria-hidden="true" />
            {copy.appointments.cancel}
          </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
