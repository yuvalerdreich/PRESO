'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Building2, CalendarDays, Clock3, MapPin, Phone, UsersRound, Wrench } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { DashboardBusiness } from '@/types/dashboard';

export function DashboardShell({ business, active, children }: { business: DashboardBusiness; active: 'overview' | 'appointments' | 'services'; children: ReactNode }) {
  const { locale, copy } = useLanguage();
  const nav = [{ id: 'overview' as const, href: '/dashboard', label: copy.dashboard.overview, Icon: Building2 }, { id: 'appointments' as const, href: '/dashboard/appointments', label: copy.dashboard.appointments, Icon: CalendarDays }, { id: 'services' as const, href: '/dashboard/services', label: copy.dashboard.services, Icon: Wrench }];
  return <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-6 sm:py-10 lg:py-12">
    <section className="relative isolate overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_12%_14%,rgba(126,99,255,.4),transparent_28%),linear-gradient(118deg,#151c47,#111933_55%,#38206f)] p-6 text-white shadow-[0_22px_48px_rgba(34,37,88,.2)] sm:p-9">
      <div className="pointer-events-none absolute -end-20 -top-24 size-72 rounded-full border border-white/15" />
      <div className="relative flex flex-wrap items-start justify-between gap-5"><div><p className="text-sm font-bold text-violet-200">{copy.dashboard.eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{business.name[locale]}</h1><div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-indigo-100"><span className="rounded-full bg-white/10 px-3 py-1.5">{business.category[locale]}</span><span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5"><MapPin size={13} aria-hidden="true" />{business.area[locale]}</span><span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5"><Phone size={13} aria-hidden="true" />{business.phone}</span></div></div><span className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-violet-100">{copy.dashboard.mockNotice}</span></div>
      <nav className="relative mt-7 flex gap-2 overflow-x-auto border-t border-white/15 pt-5 [scrollbar-width:none]" aria-label={copy.dashboard.title}>{nav.map(({ id, href, label, Icon }) => <Link key={id} href={href} aria-current={active === id ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-white ${active === id ? 'bg-white text-[var(--brand)] shadow-sm' : 'bg-white/8 text-white hover:bg-white/15'}`}><Icon size={16} aria-hidden="true" />{label}</Link>)}<span aria-disabled="true" className="inline-flex shrink-0 cursor-not-allowed items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-bold text-indigo-200"><UsersRound size={16} aria-hidden="true" />{copy.dashboard.staff}</span><span aria-disabled="true" className="inline-flex shrink-0 cursor-not-allowed items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-bold text-indigo-200"><Clock3 size={16} aria-hidden="true" />{copy.dashboard.availability}</span></nav>
    </section>{children}
  </main>;
}
