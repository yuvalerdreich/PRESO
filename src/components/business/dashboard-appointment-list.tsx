'use client';

import { useState } from 'react';
import { CalendarClock, CalendarDays, Clock, Phone, Scissors, XCircle } from 'lucide-react';

import { AppointmentStatusBadge } from '@/components/common/appointment-status-badge';
import { actionButton } from '@/components/common/button-styles';
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
import { CancelAppointmentDialog } from '@/components/business/cancel-appointment-dialog';
import { RescheduleAppointmentDialog } from '@/components/business/reschedule-appointment-dialog';
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
  const [rescheduleTarget, setRescheduleTarget] = useState<DashboardAppointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<DashboardAppointment | null>(null);

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
    <>
      <ul className="flex flex-col gap-3">
        {appointments.map((appointment) => (
          <li key={appointment.id}>
            <AppointmentRow
              appointment={appointment}
              onReschedule={() => setRescheduleTarget(appointment)}
              onCancel={() => setCancelTarget(appointment)}
            />
          </li>
        ))}
      </ul>

      {rescheduleTarget ? (
        <RescheduleAppointmentDialog
          appointment={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
        />
      ) : null}

      {cancelTarget ? (
        <CancelAppointmentDialog appointment={cancelTarget} onClose={() => setCancelTarget(null)} />
      ) : null}
    </>
  );
}

function AppointmentRow({
  appointment,
  onReschedule,
  onCancel,
}: {
  appointment: DashboardAppointment;
  onReschedule: () => void;
  onCancel: () => void;
}) {
  const { copy } = useLanguage();
  const isCancelled = appointment.status === 'CANCELLED';
  // §6.3/§6.4 steps 2 (cancel_appointment/reschedule_appointment) both only accept
  // PENDING/CONFIRMED — matches that guard here so neither button offers a transition the RPC
  // would refuse.
  const isActionable = appointment.status === 'PENDING' || appointment.status === 'CONFIRMED';

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

      {/* No date here: every row on the screen shares the selected day, so repeating it per row
          would say nothing the header above the list hasn't already said. An actionable row
          trades its status badge for the two actions themselves — cancel/reschedule already say
          "this is live"; a cancelled row has neither action, so it keeps the badge as its only
          way of saying what happened to it (§6.9's dimmed-but-listed history). */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        {isActionable ? (
          <>
            <button
              type="button"
              onClick={onCancel}
              className={`${actionButton} rounded-full px-3.5 py-2 text-xs`}
            >
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              {copy.dashboard.diary.cancelDialog.action}
            </button>
            <button
              type="button"
              onClick={onReschedule}
              className={`${actionButton} rounded-full px-3.5 py-2 text-xs`}
            >
              <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
              {copy.appointments.reschedule}
            </button>
          </>
        ) : (
          <AppointmentStatusBadge status={appointment.status} />
        )}
      </div>
    </article>
  );
}
