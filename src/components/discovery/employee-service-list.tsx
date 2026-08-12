'use client';

import { Clock3, WalletCards } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { EmployeeService } from '@/types/domain';

export function EmployeeServiceList({ services }: { services: EmployeeService[] }) {
  const { locale, copy } = useLanguage();

  return (
    <div className="mt-7 grid gap-4">
      {services.map((service) => (
        <article key={service.id} className="rounded-[1.5rem] border border-[var(--line)] bg-white p-5 shadow-[0_10px_26px_rgba(37,42,92,.06)] transition hover:border-violet-200 hover:shadow-[0_16px_32px_rgba(69,54,180,.1)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black tracking-tight">{service.name[locale]}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">{service.description[locale]}</p>
            </div>
            <span className="rounded-xl bg-[var(--soft-violet)] px-3 py-2 text-sm font-black text-[var(--brand)]">{copy.businessProfile.price}{service.price}</span>
          </div>
          <div className="mt-5 flex items-center gap-2 border-t border-[var(--line)] pt-4 text-sm font-semibold text-[#536383]">
            <Clock3 aria-hidden="true" size={16} className="text-[var(--brand)]" />
            {service.durationMinutes} {copy.businessProfile.duration}
            <WalletCards aria-hidden="true" size={16} className="ms-3 text-[var(--brand)]" />
            {copy.businessProfile.price}{service.price}
          </div>
        </article>
      ))}
    </div>
  );
}
