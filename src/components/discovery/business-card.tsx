'use client';

import { MapPin, UsersRound } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { DiscoveryBusiness } from '@/types/domain';

const imageVariants = {
  studio: 'from-slate-900 via-slate-700 to-zinc-300',
  clinic: 'from-rose-200 via-amber-100 to-stone-500',
  fitness: 'from-stone-950 via-stone-700 to-amber-200',
} as const;

export function BusinessCard({ business }: { business: DiscoveryBusiness }) {
  const { locale, copy } = useLanguage();

  return (
    <article className="overflow-hidden rounded-3xl border border-[var(--line)] bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-100/70">
      <div className={`relative flex h-50 flex-col items-start justify-end overflow-hidden bg-gradient-to-br p-5 ${imageVariants[business.imageVariant]}`}>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_15%,rgba(8,14,38,.84)_100%)]" />
        <span className="relative rounded-lg bg-[var(--brand)] px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-indigo-950/25">
          {business.category.name[locale]}
        </span>
        <h3 className="relative mt-3 text-xl font-bold text-white">{business.name[locale]}</h3>
      </div>
      <div className="p-5">
        <p className="min-h-12 text-sm leading-6 text-[#536383]">{business.description[locale]}</p>
        <div className="mt-4 flex items-center gap-2 text-sm text-[#667596]">
          <MapPin aria-hidden="true" size={16} className="shrink-0 text-[var(--brand)]" />
          <span>{business.address[locale]}</span>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-[var(--line)] pt-4 text-sm">
          <span className="inline-flex items-center gap-2 text-[#536383]">
            <UsersRound aria-hidden="true" size={16} className="text-[var(--brand)]" />
            {business.employeeCount} {copy.discovery.staffCount}
          </span>
          <span className="font-semibold text-[var(--brand)]">{copy.discovery.detailsSoon}</span>
        </div>
      </div>
    </article>
  );
}
