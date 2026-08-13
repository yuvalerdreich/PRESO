'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { DashboardServiceList } from '@/components/dashboard/dashboard-service-list';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { ServiceFormModal } from '@/components/dashboard/service-form-modal';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { DashboardBusiness, DashboardEmployee, DashboardService } from '@/types/dashboard';

export function DashboardServicesPage({ business, employees, services }: { business: DashboardBusiness; employees: DashboardEmployee[]; services: DashboardService[] }) {
  const { locale, copy } = useLanguage();
  const [localServices, setLocalServices] = useState(services);
  const [editing, setEditing] = useState<DashboardService | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const saveService = (draft: { employeeId: string; name: string; description: string; durationMinutes: number; bufferMinutes: number; price: number; status: DashboardService['status'] }) => { const localized = { he: draft.name, en: draft.name }; const localizedDescription = { he: draft.description, en: draft.description }; if (editing) setLocalServices((current) => current.map((service) => service.id === editing.id ? { ...service, ...draft, name: localized, description: localizedDescription } : service)); else setLocalServices((current) => [...current, { id: `demo-service-${Date.now()}`, ...draft, name: localized, description: localizedDescription }]); setFormOpen(false); setEditing(null); setNotice(copy.dashboard.serviceSaved); };
  const toggleStatus = (serviceId: string) => setLocalServices((current) => current.map((service) => service.id === serviceId ? { ...service, status: service.status === 'active' ? 'inactive' : 'active' } : service));
  const close = () => { setFormOpen(false); setEditing(null); };

  return <DashboardShell business={business} active="services"><section className="mt-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-[var(--brand)]">{copy.dashboard.services}</p><h2 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{copy.dashboard.servicesTitle}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{copy.dashboard.servicesDescription}</p></div><button type="button" onClick={() => { setEditing(null); setFormOpen(true); }} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(82,56,247,.24)] transition hover:-translate-y-0.5 hover:bg-[var(--brand-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"><Plus size={16} aria-hidden="true" />{copy.dashboard.addService}</button></div>{notice && <p role="status" className="mt-5 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{notice}</p>}<div className="mt-6"><DashboardServiceList services={localServices} employees={employees} onEdit={(service) => { setEditing(service); setFormOpen(true); }} onToggleStatus={toggleStatus} /></div></section><ServiceFormModal key={`${editing?.id ?? 'new'}-${locale}`} isOpen={formOpen} service={editing} employees={employees} onClose={close} onSave={saveService} /></DashboardShell>;
}
