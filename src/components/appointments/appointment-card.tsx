'use client';

import { CalendarDays, Clock3, MapPin, UserRound } from 'lucide-react';

import { AppointmentStatusBadge } from '@/components/appointments/appointment-status-badge';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { AppointmentStatus, ClientAppointment } from '@/types/appointments';

type AppointmentCardProps = {
  appointment: ClientAppointment;
  status: AppointmentStatus;
  wasCancelledInDemo: boolean;
  onCancel?: (appointment: ClientAppointment) => void;
};

export function AppointmentCard({ appointment, status, wasCancelledInDemo, onCancel }: AppointmentCardProps) {
  const { locale, copy } = useLanguage();

  return (
    <article className="rounded-[1.55rem] border border-[var(--line)] bg-white p-5 shadow-[0_10px_26px_rgba(37,42,92,.06)] transition hover:border-violet-200 hover:shadow-[0_16px_32px_rgba(69,54,180,.1)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black tracking-tight">{appointment.businessName[locale]}</p>
          <p className="mt-1 text-sm font-bold text-[var(--brand)]">{appointment.serviceName[locale]}</p>
        </div>
        <AppointmentStatusBadge status={status} />
      </div>

      <dl className="mt-5 grid gap-3 border-y border-[var(--line)] py-4 text-sm sm:grid-cols-2">
        <div className="flex items-start gap-2.5 text-[#536383]">
          <CalendarDays aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-[var(--brand)]" />
          <div><dt className="sr-only">{copy.appointments.appointmentAt}</dt><dd className="font-semibold">{appointment.date[locale]}</dd></div>
        </div>
        <div className="flex items-start gap-2.5 text-[#536383]">
          <Clock3 aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-[var(--brand)]" />
          <dd className="font-semibold tabular-nums">{appointment.time}</dd>
        </div>
        <div className="flex items-start gap-2.5 text-[#536383]">
          <UserRound aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-[var(--brand)]" />
          <div><dt className="sr-only">{copy.appointments.serviceWith}</dt><dd className="font-semibold">{appointment.employeeName[locale]}</dd></div>
        </div>
        <div className="flex items-start gap-2.5 text-[#536383]">
          <MapPin aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-[var(--brand)]" />
          <div><dt className="sr-only">{copy.appointments.address}</dt><dd className="font-semibold">{appointment.address[locale]}</dd></div>
        </div>
      </dl>

      <div className="mt-4 flex min-h-8 items-center justify-between gap-3">
        {wasCancelledInDemo ? (
          <p className="text-xs font-bold text-rose-600">{copy.appointments.cancelledDemo}</p>
        ) : <span />}
        {onCancel && status !== 'cancelled' && (
          <button type="button" onClick={() => onCancel(appointment)} className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-100 focus-visible:outline-2 focus-visible:outline-rose-500">
            {copy.appointments.cancel}
          </button>
        )}
      </div>
    </article>
  );
}
