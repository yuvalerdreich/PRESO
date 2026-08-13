'use client';

import { Phone, UserRound, Wrench } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { DashboardEmployee, DashboardService } from '@/types/dashboard';

export function DashboardStaffCard({ employee, services, onViewDetails }: { employee: DashboardEmployee; services: DashboardService[]; onViewDetails: () => void }) {
  const { locale, copy } = useLanguage();
  const active = employee.status === 'active';

  return <article className="rounded-[1.5rem] border border-[var(--line)] bg-white p-5 shadow-[0_10px_26px_rgba(37,42,92,.06)] transition hover:border-violet-200 hover:shadow-[0_16px_32px_rgba(69,54,180,.1)] sm:p-6"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[var(--soft-violet)] text-[var(--brand)]"><UserRound size={23} aria-hidden="true" /></span><div><h2 className="text-xl font-black tracking-tight">{employee.name[locale]}</h2><p className="mt-1 text-sm font-bold text-[var(--brand)]">{employee.position[locale]}</p></div></div><span className={`rounded-full px-3 py-1 text-xs font-black ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{active ? copy.dashboard.active : copy.dashboard.inactive}</span></div><div className="mt-5 grid gap-2 border-y border-[var(--line)] py-4 text-sm font-semibold text-[#536383] sm:grid-cols-2"><span className="inline-flex items-center gap-2"><Phone size={15} className="text-[var(--brand)]" aria-hidden="true" />{employee.contactLabel}</span><span className="inline-flex items-center gap-2"><Wrench size={15} className="text-[var(--brand)]" aria-hidden="true" />{services.length} {copy.dashboard.serviceCount}</span></div><div className="mt-4"><p className="text-xs font-black uppercase tracking-wide text-[var(--muted)]">{copy.dashboard.assignedServices}</p><div className="mt-2 flex flex-wrap gap-2">{services.length ? services.map((service) => <span key={service.id} className="rounded-full bg-[var(--soft-violet)] px-3 py-1.5 text-xs font-bold text-[var(--brand)]">{service.name[locale]}</span>) : <span className="text-sm text-[var(--muted)]">—</span>}</div></div><button type="button" onClick={onViewDetails} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-[var(--brand)]"><UserRound size={15} aria-hidden="true" />{copy.dashboard.viewEmployeeDetails}</button></article>;
}
