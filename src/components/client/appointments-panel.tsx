'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarDays, CalendarX } from 'lucide-react';

import { AppointmentCard } from '@/components/client/appointment-card';
import { AppointmentsTabs, type AppointmentsTabId } from '@/components/client/appointments-tabs';
import { CancelAppointmentDialog } from '@/components/client/cancel-appointment-dialog';
import { actionButton } from '@/components/common/button-styles';
import { PanelHero } from '@/components/common/panel-hero';
import { readApiErrorMessage } from '@/lib/api-error';
import { isUpcomingAppointment } from '@/lib/appointments/classify';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { ClientAppointment, ClientWaitlistEntry } from '@/types/domain';

export function AppointmentsPanel({
  appointments,
  waitlistEntries,
  backHref,
}: {
  appointments: ClientAppointment[];
  waitlistEntries: ClientWaitlistEntry[];
  backHref?: string;
}) {
  const { copy, direction } = useLanguage();
  const router = useRouter();
  const BackArrow = direction === 'rtl' ? ArrowRight : ArrowLeft;
  const [activeTab, setActiveTab] = useState<AppointmentsTabId>('upcoming');
  const [cancelTarget, setCancelTarget] = useState<ClientAppointment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const upcoming = useMemo(
    () => appointments.filter((appointment) => isUpcomingAppointment(appointment)),
    [appointments],
  );
  const history = useMemo(
    () => appointments.filter((appointment) => !isUpcomingAppointment(appointment)),
    [appointments],
  );

  const tabs = [
    { id: 'upcoming' as const, label: copy.appointments.upcoming, count: upcoming.length },
    { id: 'waitlist' as const, label: copy.appointments.waitlist, count: waitlistEntries.length },
    { id: 'history' as const, label: copy.appointments.history, count: history.length },
  ];

  /**
   * `PATCH /api/appointments/[id]` with `action: 'cancel'` — a route handler, not a server action,
   * because the two failure modes need different words: a 422 means the business's cancellation
   * window has closed (`cancel_appointment()` raises it), which the user can act on, while a 403
   * or 404 means the row isn't theirs to cancel. §8.4 already put the right sentence in
   * `error.message`, so it is shown verbatim.
   *
   * On success the dialog closes and `router.refresh()` re-runs the server component that fetched
   * these props, so the row reappears under History carrying the real `status: 'CANCELLED'`. No
   * local "cancelled" set is kept — the database is the only source of truth for that now.
   */
  async function confirmCancel() {
    if (!cancelTarget || isCancelling) return;
    setIsCancelling(true);
    setCancelError(null);

    try {
      const response = await fetch(`/api/appointments/${cancelTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });

      if (!response.ok) {
        setCancelError((await readApiErrorMessage(response)) ?? copy.appointments.cancelError);
        return;
      }

      setCancelTarget(null);
      setActiveTab('history');
      router.refresh();
    } catch {
      setCancelError(copy.appointments.cancelError);
    } finally {
      setIsCancelling(false);
    }
  }

  function closeCancelDialog() {
    setCancelTarget(null);
    setCancelError(null);
  }

  function startReschedule(appointment: ClientAppointment) {
    if (!appointment.businessId || !appointment.employeeId || !appointment.serviceId) return;
    const query = new URLSearchParams({ reschedule: appointment.id });
    router.push(`/b/${appointment.businessId}/e/${appointment.employeeId}/s/${appointment.serviceId}?${query.toString()}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      {backHref ? (
        <Link
          href={backHref}
          className={`${actionButton} w-fit rounded-full px-4 py-2 text-sm`}
        >
          <BackArrow className="h-4 w-4" aria-hidden="true" />
          {copy.appointments.backToBusiness}
        </Link>
      ) : null}

      <PanelHero title={copy.appointments.title} description={copy.appointments.description} icon={CalendarDays}>
        <AppointmentsTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="hero" />
      </PanelHero>

      <div
        role="tabpanel"
        id={`appointments-tabpanel-${activeTab}`}
        aria-labelledby={`appointments-tab-${activeTab}`}
        className="w-full"
      >
        {activeTab === 'upcoming' ? (
          upcoming.length > 0 ? (
            <div dir="rtl" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {upcoming.map((appointment) => (
                <div key={appointment.id} dir={direction}>
                  <AppointmentCard
                    appointment={appointment}
                    onCancel={() => setCancelTarget(appointment)}
                    onReschedule={
                      appointment.businessId && appointment.employeeId && appointment.serviceId
                        ? () => startReschedule(appointment)
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyTabState text={copy.appointments.noUpcoming} />
          )
        ) : null}

        {activeTab === 'waitlist' ? (
          waitlistEntries.length > 0 ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-[var(--muted)]">{copy.appointments.waitlistDescription}</p>
              <div dir="rtl" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {waitlistEntries.map((entry) => (
                  <div key={entry.id} dir={direction}>
                    <article className="flex h-full flex-col gap-2 rounded-3xl border border-[var(--line)] bg-white p-5 shadow-[0_16px_35px_-28px_rgba(23,27,70,0.55)]">
                      <p className="text-base font-bold text-[var(--foreground)]">{entry.serviceName} · {entry.employeeName}</p>
                      <p className="text-sm font-semibold text-[var(--brand)]">{entry.businessName}</p>
                      <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-[var(--muted)]">
                        {copy.appointments.requestedRange}: {entry.requestedDateISO} · {entry.requestedRange}
                      </p>
                    </article>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyTabState text={copy.appointments.noWaitlist} />
          )
        ) : null}

        {activeTab === 'history' ? (
          history.length > 0 ? (
            <div dir="rtl" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {history.map((appointment) => (
                <div key={appointment.id} dir={direction}>
                  <AppointmentCard appointment={appointment} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyTabState text={copy.appointments.noHistory} />
          )
        ) : null}
      </div>

      {cancelTarget ? (
        <CancelAppointmentDialog
          appointment={cancelTarget}
          pending={isCancelling}
          error={cancelError}
          onClose={closeCancelDialog}
          onConfirm={confirmCancel}
        />
      ) : null}
    </div>
  );
}

function EmptyTabState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-[var(--line)] bg-white px-6 py-14 text-center">
      <CalendarX className="h-8 w-8 text-[var(--muted)]" aria-hidden="true" />
      <p className="text-sm text-[var(--muted)]">{text}</p>
    </div>
  );
}
