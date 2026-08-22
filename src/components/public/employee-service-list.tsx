'use client';

import Link from 'next/link';
import { Calendar, Check, Clock } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { EmployeeSummary, ServiceSummary } from '@/types/domain';

function ServiceCard({ service, href, selected }: { service: ServiceSummary; href: string; selected: boolean }) {
  const { copy } = useLanguage();

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-4 ${
        selected ? 'border-[var(--brand)] bg-[var(--soft-violet)]' : 'border-[var(--line)] bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[var(--foreground)]">{service.name}</h3>
            {selected ? (
              <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-xs font-semibold text-white">
                {copy.businessProfile.serviceSelectedBadge}
              </span>
            ) : null}
          </div>
          <p className="text-sm text-[var(--muted)]">{service.description}</p>
        </div>
        <span className="shrink-0 text-lg font-bold text-[var(--brand)]">
          {service.price}
          {copy.businessProfile.price}
        </span>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        {service.durationMinutes} {copy.businessProfile.durationUnit}
        {' '}
        (+{service.bufferMinutes} {copy.businessProfile.durationUnit} {copy.businessProfile.bufferLabel})
      </p>

      <Link
        href={href}
        scroll={false}
        className={`mt-1 flex items-center justify-center gap-1.5 rounded-full border pt-3 pb-2.5 text-sm font-semibold transition-colors ${
          selected
            ? 'border-transparent bg-[var(--brand)] text-white'
            : 'border-t border-[var(--line)] border-x-0 border-b-0 text-[var(--brand)] hover:bg-[var(--soft-violet)]'
        }`}
      >
        {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : <Calendar className="h-4 w-4" aria-hidden="true" />}
        {selected ? copy.businessProfile.serviceSelectedAction : copy.businessProfile.chooseServiceAction}
      </Link>
    </div>
  );
}

export function EmployeeServiceList({
  businessId,
  employee,
  services,
  selectedServiceId,
}: {
  businessId: string;
  employee: EmployeeSummary;
  services: ServiceSummary[];
  selectedServiceId?: string;
}) {
  const { copy } = useLanguage();

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">{copy.businessProfile.treatmentTypesTitle}</h2>
          <p className="text-sm text-[var(--brand-deep)]">
            {copy.businessProfile.treatmentsForPrefix}
            {employee.fullName} ({services.length})
          </p>
        </div>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-semibold text-white">
          2
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            href={`/b/${businessId}/e/${employee.id}/s/${service.id}`}
            selected={service.id === selectedServiceId}
          />
        ))}
      </div>
    </section>
  );
}
