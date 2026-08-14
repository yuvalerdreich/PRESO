'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, CalendarX } from 'lucide-react';

import { AppointmentCard } from '@/components/client/appointment-card';
import { AppointmentsTabs, type AppointmentsTabId } from '@/components/client/appointments-tabs';
import { CancelAppointmentDialog } from '@/components/client/cancel-appointment-dialog';
import { isUpcomingAppointment } from '@/lib/appointments/classify';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { ClientAppointment, ClientWaitlistEntry } from '@/types/appointments';

export function AppointmentsPanel({
  appointments,
  waitlistEntries,
}: {
  appointments: ClientAppointment[];
  waitlistEntries: ClientWaitlistEntry[];
}) {
  const { copy, locale } = useLanguage();

  const [activeTab, setActiveTab] = useState<AppointmentsTabId>('upcoming');
  // Appointments cancelled through this panel's demo flow. Kept separate from
  // `appointment.status` (rather than mutating it) so the difference between a
  // "real" cancelled appointment and one cancelled in this demo session stays
  // visible (see copy.appointments.cancelledDemo) — and so this stays local
  // state that never writes back to the fetched data.
  const [demoCancelledIds, setDemoCancelledIds] = useState<Set<string>>(new Set());
  const [cancelTarget, setCancelTarget] = useState<ClientAppointment | null>(null);

  const upcoming = useMemo(
    () => appointments.filter((appointment) => isUpcomingAppointment(appointment, demoCancelledIds)),
    [appointments, demoCancelledIds],
  );
  const history = useMemo(
    () => appointments.filter((appointment) => !isUpcomingAppointment(appointment, demoCancelledIds)),
    [appointments, demoCancelledIds],
  );

  const tabs = [
    { id: 'upcoming' as const, label: copy.appointments.upcoming, count: upcoming.length },
    { id: 'waitlist' as const, label: copy.appointments.waitlist, count: waitlistEntries.length },
    { id: 'history' as const, label: copy.appointments.history, count: history.length },
  ];

  function confirmCancel() {
    if (!cancelTarget) return;
    setDemoCancelledIds((prev) => new Set(prev).add(cancelTarget.id));
    setCancelTarget(null);
    setActiveTab('history');
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[var(--foreground)]">{copy.appointments.title}</h1>
          <p className="text-sm text-[var(--muted)]">{copy.appointments.description}</p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-white">
          <CalendarDays className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      <AppointmentsTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div
        role="tabpanel"
        id={`appointments-tabpanel-${activeTab}`}
        aria-labelledby={`appointments-tab-${activeTab}`}
        className="flex flex-col gap-3"
      >
        {activeTab === 'upcoming' ? (
          upcoming.length > 0 ? (
            upcoming.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onCancel={() => setCancelTarget(appointment)}
              />
            ))
          ) : (
            <EmptyTabState text={copy.appointments.noUpcoming} />
          )
        ) : null}

        {activeTab === 'waitlist' ? (
          waitlistEntries.length > 0 ? (
            <>
              <p className="text-sm text-[var(--muted)]">{copy.appointments.waitlistDescription}</p>
              {waitlistEntries.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-1 rounded-2xl border border-[var(--line)] bg-white p-4">
                  <p className="text-sm font-bold text-[var(--foreground)]">
                    {entry.serviceName[locale]} · {entry.employeeName[locale]}
                  </p>
                  <p className="text-sm text-[var(--brand-deep)]">{entry.businessName[locale]}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {copy.appointments.requestedRange}: {entry.requestedDateISO} · {entry.requestedRange}
                  </p>
                </div>
              ))}
            </>
          ) : (
            <EmptyTabState text={copy.appointments.noWaitlist} />
          )
        ) : null}

        {activeTab === 'history' ? (
          history.length > 0 ? (
            history.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                cancelledInDemo={demoCancelledIds.has(appointment.id)}
              />
            ))
          ) : (
            <EmptyTabState text={copy.appointments.noHistory} />
          )
        ) : null}
      </div>

      <p className="text-xs text-[var(--muted)]">{copy.appointments.demoNotice}</p>

      {cancelTarget ? (
        <CancelAppointmentDialog
          appointment={cancelTarget}
          onClose={() => setCancelTarget(null)}
          onConfirm={confirmCancel}
        />
      ) : null}
    </div>
  );
}

function EmptyTabState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--line)] px-6 py-14 text-center">
      <CalendarX className="h-8 w-8 text-[var(--muted)]" aria-hidden="true" />
      <p className="text-sm text-[var(--muted)]">{text}</p>
    </div>
  );
}
