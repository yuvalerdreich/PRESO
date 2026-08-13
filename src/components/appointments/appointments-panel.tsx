'use client';

import { CalendarDays, Clock3, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';

import { AppointmentCard } from '@/components/appointments/appointment-card';
import { AppointmentsTabs } from '@/components/appointments/appointments-tabs';
import { CancelAppointmentDialog } from '@/components/appointments/cancel-appointment-dialog';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { ClientAppointment, ClientWaitlistEntry } from '@/types/appointments';

type AppointmentTab = 'upcoming' | 'waitlist' | 'history';

type AppointmentsPanelProps = {
  appointments: ClientAppointment[];
  waitlistEntries: ClientWaitlistEntry[];
  variant?: 'page' | 'modal';
};

function EmptyAppointments({ message }: { message: string }) {
  return <p className="rounded-[1.5rem] border border-dashed border-violet-200 bg-violet-50/55 px-5 py-10 text-center text-sm font-semibold text-[var(--muted)]">{message}</p>;
}

export function AppointmentsPanel({ appointments, waitlistEntries, variant = 'page' }: AppointmentsPanelProps) {
  const { locale, copy } = useLanguage();
  const [activeTab, setActiveTab] = useState<AppointmentTab>('upcoming');
  const [appointmentToCancel, setAppointmentToCancel] = useState<ClientAppointment | null>(null);
  const [cancelledInDemo, setCancelledInDemo] = useState<string[]>([]);

  const upcoming = appointments.filter((appointment) => appointment.period === 'upcoming' && !cancelledInDemo.includes(appointment.id));
  const history = useMemo(
    () => appointments.filter((appointment) => appointment.period === 'history').concat(appointments.filter((appointment) => cancelledInDemo.includes(appointment.id))),
    [appointments, cancelledInDemo],
  );
  const tabs = [
    { id: 'upcoming' as const, label: copy.appointments.upcoming, count: upcoming.length },
    { id: 'waitlist' as const, label: copy.appointments.waitlist, count: waitlistEntries.length },
    { id: 'history' as const, label: copy.appointments.history, count: history.length },
  ];
  const pageClasses = variant === 'page'
    ? 'mx-auto w-full max-w-5xl flex-1 px-4 py-7 sm:px-6 sm:py-10 lg:py-12'
    : 'p-5 sm:p-7';

  const confirmCancellation = () => {
    if (!appointmentToCancel) return;
    setCancelledInDemo((ids) => [...ids, appointmentToCancel.id]);
    setAppointmentToCancel(null);
    setActiveTab('history');
  };

  return (
    <section className={pageClasses} aria-labelledby="appointments-heading">
      <div className={variant === 'page' ? 'rounded-[2rem] border border-violet-100 bg-[radial-gradient(circle_at_86%_10%,rgba(137,109,255,.28),transparent_30%),linear-gradient(125deg,#171e48,#38206f)] p-6 text-white shadow-[0_20px_44px_rgba(36,32,99,.18)] sm:p-9' : ''}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className={`inline-flex items-center gap-2 text-sm font-bold ${variant === 'page' ? 'text-violet-200' : 'text-[var(--brand)]'}`}><CalendarDays aria-hidden="true" size={16} />{copy.header.appointments}</p>
            <h1 id="appointments-heading" className={`mt-2 text-3xl font-black tracking-tight sm:text-4xl ${variant === 'page' ? 'text-white' : 'text-[var(--foreground)]'}`}>{copy.appointments.title}</h1>
            <p className={`mt-3 max-w-2xl text-sm leading-6 sm:text-base ${variant === 'page' ? 'text-indigo-100' : 'text-[var(--muted)]'}`}>{copy.appointments.description}</p>
          </div>
          <p className={`rounded-xl px-3 py-2 text-xs font-bold ${variant === 'page' ? 'bg-white/10 text-violet-100' : 'bg-violet-50 text-[var(--brand)]'}`}>{copy.appointments.demoNotice}</p>
        </div>
      </div>

      <div className={variant === 'page' ? 'mt-7' : 'mt-6'}>
        <AppointmentsTabs activeTab={activeTab} tabs={tabs} onChange={setActiveTab} />
      </div>

      <div className="mt-5" role="tabpanel">
        {activeTab === 'upcoming' && (
          upcoming.length > 0 ? <div className="grid gap-4">{upcoming.map((appointment) => <AppointmentCard key={appointment.id} appointment={appointment} status={appointment.status} wasCancelledInDemo={false} onCancel={setAppointmentToCancel} />)}</div> : <EmptyAppointments message={copy.appointments.noUpcoming} />
        )}
        {activeTab === 'history' && (
          history.length > 0 ? <div className="grid gap-4">{history.map((appointment) => {
            const isDemoCancellation = cancelledInDemo.includes(appointment.id);
            return <AppointmentCard key={appointment.id} appointment={appointment} status={isDemoCancellation ? 'cancelled' : appointment.status} wasCancelledInDemo={isDemoCancellation} />;
          })}</div> : <EmptyAppointments message={copy.appointments.noHistory} />
        )}
        {activeTab === 'waitlist' && (
          waitlistEntries.length > 0 ? <div className="grid gap-4">{waitlistEntries.map((entry) => (
            <article key={entry.id} className="rounded-[1.55rem] border border-[var(--line)] bg-white p-5 shadow-[0_10px_26px_rgba(37,42,92,.06)] sm:p-6">
              <p className="text-lg font-black tracking-tight">{entry.businessName[locale]}</p>
              <p className="mt-1 text-sm font-bold text-[var(--brand)]">{entry.serviceName[locale]} · {entry.employeeName[locale]}</p>
              <div className="mt-5 flex items-start gap-2.5 border-y border-[var(--line)] py-4 text-sm text-[#536383]"><Clock3 aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-[var(--brand)]" /><div><p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{copy.appointments.requestedRange}</p><p className="mt-1 font-semibold">{entry.requestedRange[locale]}</p></div></div>
              <p className="mt-4 flex items-start gap-2 text-xs font-semibold leading-5 text-[var(--muted)]"><MapPin aria-hidden="true" size={14} className="mt-0.5 shrink-0 text-[var(--brand)]" />{copy.appointments.waitlistDescription}</p>
            </article>
          ))}</div> : <EmptyAppointments message={copy.appointments.noWaitlist} />
        )}
      </div>

      <CancelAppointmentDialog appointment={appointmentToCancel} onClose={() => setAppointmentToCancel(null)} onConfirm={confirmCancellation} />
    </section>
  );
}
