'use client';

import { Clock3, Pencil, TimerReset, UserRound, Wrench } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { DashboardEmployee, DashboardService } from '@/types/dashboard';

export function DashboardServiceList({ services, employees, onEdit, onToggleStatus }: { services: DashboardService[]; employees: DashboardEmployee[]; onEdit: (service: DashboardService) => void; onToggleStatus: (serviceId: string) => void }) {
  const { locale, copy } = useLanguage();
  const employeeById = new Map(employees.map((employee) => [employee.id, employee]));

  if (!services.length) return <p className="rounded-[1.5rem] border border-dashed border-violet-200 bg-violet-50/55 p-8 text-center text-sm font-semibold text-[var(--muted)]">{copy.dashboard.noServices}</p>;

  return <div className="grid gap-4 lg:grid-cols-2">{services.map((service) => {
    const employee = employeeById.get(service.employeeId);
    const active = service.status === 'active';
    return <article key={service.id} className="rounded-[1.5rem] border border-[var(--line)] bg-white p-5 shadow-[0_10px_26px_rgba(37,42,92,.06)] transition hover:border-violet-200 hover:shadow-[0_16px_32px_rgba(69,54,180,.1)] sm:p-6"><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><span className="inline-flex size-9 items-center justify-center rounded-xl bg-[var(--soft-violet)] text-[var(--brand)]"><Wrench size={17} aria-hidden="true" /></span><h2 className="text-xl font-black tracking-tight">{service.name[locale]}</h2></div><p className="mt-3 text-sm leading-6 text-[var(--muted)]">{service.description[locale]}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{active ? copy.dashboard.active : copy.dashboard.inactive}</span></div><div className="mt-5 grid gap-2 border-y border-[var(--line)] py-4 text-sm font-semibold text-[#536383] sm:grid-cols-3"><span className="inline-flex items-center gap-2"><UserRound size={15} className="text-[var(--brand)]" aria-hidden="true" />{employee?.name[locale] ?? service.employeeId}</span><span className="inline-flex items-center gap-2"><Clock3 size={15} className="text-[var(--brand)]" aria-hidden="true" />{service.durationMinutes} {copy.businessProfile.duration}</span><span className="inline-flex items-center gap-2"><TimerReset size={15} className="text-[var(--brand)]" aria-hidden="true" />{copy.dashboard.buffer}: {service.bufferMinutes}</span></div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><strong className="text-lg font-black text-[var(--brand)]">{copy.businessProfile.price}{service.price}</strong><div className="flex gap-2"><button type="button" onClick={() => onToggleStatus(service.id)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-[var(--brand)]">{active ? copy.dashboard.deactivate : copy.dashboard.activate}</button><button type="button" onClick={() => onEdit(service)} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--soft-violet)] px-3 py-2 text-xs font-bold text-[var(--brand)] transition hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-[var(--brand)]"><Pencil size={14} aria-hidden="true" />{copy.dashboard.editService}</button></div></div></article>;
  })}</div>;
}
