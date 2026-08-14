'use client';

import { Calendar, Clock, MapPin } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { ClientAppointment } from '@/types/appointments';

const STATUS_STYLES: Record<'confirmed' | 'pending' | 'cancelled', string> = {
  confirmed: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  cancelled: 'bg-[var(--soft-violet)] text-[var(--muted)]',
};

export function AppointmentCard({
  appointment,
  cancelledInDemo,
  onCancel,
}: {
  appointment: ClientAppointment;
  cancelledInDemo?: boolean;
  onCancel?: () => void;
}) {
  const { copy, locale } = useLanguage();

  const statusLabel = cancelledInDemo ? copy.appointments.cancelledDemo : copy.appointments[appointment.status];
  const statusStyle = STATUS_STYLES[appointment.status];

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[var(--foreground)]">
            {copy.appointments.serviceWith} {appointment.employeeName[locale]} · {appointment.businessName[locale]}
          </p>
          <p className="text-sm text-[var(--brand-deep)]">{appointment.serviceName[locale]}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle}`}>
          {statusLabel}
        </span>
      </div>

      <div className="flex flex-col gap-1 text-sm text-[var(--muted)]">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4" aria-hidden="true" />
          {copy.appointments.appointmentAt} {appointment.dateISO}
          <Clock className="h-4 w-4" aria-hidden="true" />
          {appointment.time}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4" aria-hidden="true" />
          {appointment.address[locale]}
        </span>
      </div>

      {onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="self-start rounded-full border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--soft-violet)]"
        >
          {copy.appointments.cancel}
        </button>
      ) : null}
    </div>
  );
}
