'use client';

import { CalendarDays, Clock, Phone, Scissors } from 'lucide-react';

import { AppointmentStatusBadge } from '@/components/common/appointment-status-badge';
import {
  cardHoverLift,
  cardMetaIcon,
  cardMetaList,
  cardMetaRow,
  cardSubtitle,
  cardTitle,
  surfaceCard,
} from '@/components/common/card-styles';
import { EmptyState } from '@/components/common/empty-state';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { DashboardAppointment } from '@/types/domain';

/**
 * The diary's rows for one day, already filtered by `DashboardAppointmentsPage`.
 *
 * A list rather than the card grid the client portal uses for the same object: a business reads its
 * day *in order*, so time runs down one column and every row starts with it. The rows keep the
 * shared card shell (`card-styles.ts`) so an appointment still looks like an appointment across the
 * two portals — what changes is who the row is about. A client's card names the business and the
 * staff member; this one names the client, because that is the fact the staff member is missing.
 *
 * Cancelled rows stay in the list, dimmed and badged. They are the day's history — dropping them
 * would make a slot that is genuinely free look like it was never booked.
 */
export function DashboardAppointmentList({
  appointments,
  dateISO,
}: {
  appointments: DashboardAppointment[];
  dateISO: string;
}) {
  const { copy } = useLanguage();

  if (appointments.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title={copy.dashboard.diary.emptyTitle}
        description={copy.dashboard.diary.emptyDescription.replace('{date}', dateISO)}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {appointments.map((appointment) => (
        <li key={appointment.id}>
          <AppointmentRow appointment={appointment} />
        </li>
      ))}
    </ul>
  );
}

function AppointmentRow({ appointment }: { appointment: DashboardAppointment }) {
  const { copy } = useLanguage();
  const isCancelled = appointment.status === 'CANCELLED';

  return (
    <article
      className={`${surfaceCard} ${cardHoverLift} gap-4 p-4 sm:flex-row sm:items-center sm:gap-5 ${
        isCancelled ? 'opacity-75' : ''
      }`}
    >
      <span className="flex w-fit shrink-0 items-center gap-2 rounded-2xl bg-[var(--soft-violet)] px-4 py-2.5 text-base font-extrabold text-[var(--brand-deep)]">
        <Clock className="h-4 w-4" aria-hidden="true" />
        {appointment.time}
      </span>

      <div className="min-w-0 flex-1">
        <h3 className={cardTitle}>{appointment.clientName || copy.dashboard.diary.unnamedClient}</h3>
        <p className={`mt-1 ${cardSubtitle}`}>{appointment.employeeName}</p>

        <div className={`mt-3 ${cardMetaList} sm:grid-cols-2`}>
          <span className={cardMetaRow}>
            <Scissors className={cardMetaIcon} aria-hidden="true" />
            {appointment.serviceName}
          </span>
          <span className={cardMetaRow}>
            <Phone className={cardMetaIcon} aria-hidden="true" />
            {appointment.clientPhone ? (
              // The one action a diary row needs: the phone is here so staff can call about *this*
              // appointment, so it dials rather than only displaying.
              <a href={`tel:${appointment.clientPhone}`} className="font-semibold hover:underline">
                {appointment.clientPhone}
              </a>
            ) : (
              copy.dashboard.diary.noPhone
            )}
          </span>
        </div>
      </div>

      {/* Only the status here: every row on the screen shares the selected day, so repeating the
          date per row would say nothing the header above the list hasn't already said. */}
      <AppointmentStatusBadge status={appointment.status} />
    </article>
  );
}
