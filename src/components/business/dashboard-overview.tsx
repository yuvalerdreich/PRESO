'use client';
import Link from 'next/link';
import { ArrowUpLeft } from 'lucide-react';
import { DashboardAppointmentList } from '@/components/business/dashboard-appointment-list';
import { DashboardKpiCard } from '@/components/business/dashboard-kpi-card';
import { DashboardShell } from '@/components/business/dashboard-shell';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { DashboardAppointment, DashboardBusiness, DashboardKpi } from '@/types/dashboard';
export function DashboardOverview({ business, kpis, appointments }: { business: DashboardBusiness; kpis: DashboardKpi[]; appointments: DashboardAppointment[] }) { const { copy } = useLanguage(); return <DashboardShell business={business} active="overview"><section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpis.map((kpi) => <DashboardKpiCard key={kpi.id} kpi={kpi} />)}</section><section className="mt-10"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-bold text-[var(--brand)]">{copy.dashboard.today}</p><h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{copy.dashboard.appointmentOverview}</h2></div><Link href="/dashboard/appointments" className="inline-flex items-center gap-2 rounded-xl bg-[var(--soft-violet)] px-3 py-2 text-sm font-bold text-[var(--brand)] transition hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-[var(--brand)]">{copy.dashboard.viewAll}<ArrowUpLeft size={16} aria-hidden="true" /></Link></div><DashboardAppointmentList appointments={appointments.slice(0, 2)} /></section></DashboardShell>; }
