'use client';

import { Calendar, Clock } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { EmployeeSummary, ServiceSummary } from '@/types/domain';

function ServiceCard({ service }: { service: ServiceSummary }) {
  const { copy, locale } = useLanguage();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-bold text-[var(--foreground)]">{service.name[locale]}</h3>
          <p className="text-sm text-[var(--muted)]">{service.description[locale]}</p>
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

      <div className="mt-1 flex items-center justify-between border-t border-[var(--line)] pt-3">
        <span className="flex items-center gap-1.5 rounded-full border border-[var(--brand)]/30 px-3 py-1.5 text-xs font-semibold text-[var(--brand)]">
          <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.businessProfile.chooseServiceAction}
        </span>
        <span
          aria-disabled="true"
          title={copy.businessProfile.waitlistUnavailable}
          className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]"
        >
          {copy.businessProfile.joinWaitlist}
        </span>
      </div>
    </div>
  );
}

export function EmployeeServiceList({
  employee,
  services,
}: {
  employee: EmployeeSummary;
  services: ServiceSummary[];
}) {
  const { copy, locale } = useLanguage();

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">{copy.businessProfile.treatmentTypesTitle}</h2>
          <p className="text-sm text-[var(--brand-deep)]">
            {copy.businessProfile.treatmentsForPrefix}
            {employee.fullName[locale]} ({services.length})
          </p>
        </div>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-semibold text-white">
          2
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </section>
  );
}
