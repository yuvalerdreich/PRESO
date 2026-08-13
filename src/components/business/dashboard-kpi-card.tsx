'use client';

import { CalendarDays, CircleDollarSign, Clock3, UsersRound } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { DashboardKpi } from '@/types/dashboard';
const details = { appointments: { Icon: CalendarDays, color: 'text-violet-600' }, staff: { Icon: UsersRound, color: 'text-teal-600' }, pending: { Icon: Clock3, color: 'text-amber-600' }, revenue: { Icon: CircleDollarSign, color: 'text-rose-600' } } as const;
export function DashboardKpiCard({ kpi }: { kpi: DashboardKpi }) { const { copy } = useLanguage(); const { Icon, color } = details[kpi.id]; const labels = { appointments: copy.dashboard.appointmentsKpi, staff: copy.dashboard.staffKpi, pending: copy.dashboard.pendingKpi, revenue: copy.dashboard.revenueKpi }; return <article className="rounded-[1.6rem] border border-[var(--line)] bg-white p-5 shadow-[0_10px_26px_rgba(37,42,92,.06)]"><Icon aria-hidden="true" size={21} className={color} /><p className="mt-4 text-sm font-bold text-[var(--muted)]">{labels[kpi.id]}</p><p className="mt-1 text-3xl font-black tracking-tight">{kpi.value}</p>{kpi.id === 'revenue' && <p className="mt-2 text-xs font-bold text-rose-600">{copy.dashboard.revenueMock}</p>}</article>; }
