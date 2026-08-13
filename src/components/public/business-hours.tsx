'use client';

import { Clock3 } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { BusinessHours as BusinessHoursRow } from '@/types/domain';

export function BusinessHours({ hours }: { hours: BusinessHoursRow[] }) {
  const { locale, copy } = useLanguage();

  return (
    <section className="rounded-[1.6rem] border border-[var(--line)] bg-white p-5 shadow-[0_12px_30px_rgba(37,42,92,.06)] sm:p-6" aria-labelledby="business-hours-heading">
      <div className="flex items-center gap-3">
        <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-violet-50 text-[var(--brand)]">
          <Clock3 aria-hidden="true" size={19} strokeWidth={2.3} />
        </span>
        <h2 id="business-hours-heading" className="text-xl font-black tracking-tight">
          {copy.businessProfile.hours}
        </h2>
      </div>
      <dl className="mt-5 divide-y divide-[var(--line)]">
        {hours.map((hour) => (
          <div key={hour.day.en} className="flex items-center justify-between gap-5 py-3 text-sm">
            <dt className="font-semibold text-[#536383]">{hour.day[locale]}</dt>
            <dd className="font-bold tabular-nums text-[var(--foreground)]">
              {hour.opensAt} – {hour.closesAt}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
