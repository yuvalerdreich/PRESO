'use client';

import { MapPin, UsersRound } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { DiscoveryBusiness } from '@/types/domain';

const imageVariants = {
  studio: 'from-[#161d3e] via-[#465076] to-[#d4bfb3]',
  clinic: 'from-[#6b405f] via-[#d79b8f] to-[#f5dfba]',
  fitness: 'from-[#171d31] via-[#5f625e] to-[#dba561]',
} as const;

export function BusinessCard({ business }: { business: DiscoveryBusiness }) {
  const { locale, copy } = useLanguage();

  return (
    <article className="group overflow-hidden rounded-[1.7rem] border border-[var(--line)] bg-white shadow-[0_10px_28px_rgba(37,42,92,.07)] transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_20px_40px_rgba(69,54,180,.14)] focus-within:ring-2 focus-within:ring-[var(--brand)]">
      <div className={`relative flex h-56 flex-col items-start justify-end overflow-hidden bg-gradient-to-br p-5 sm:h-60 ${imageVariants[business.imageVariant]}`}>
        <div className="absolute -top-10 -end-7 size-35 rounded-full bg-white/20 blur-2xl transition duration-500 group-hover:scale-125" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,13,34,.02)_12%,rgba(10,14,37,.82)_100%)]" />
        <span className="relative rounded-lg border border-white/15 bg-[var(--brand)] px-3 py-1.5 text-xs font-bold text-white shadow-lg shadow-indigo-950/25">
          {business.category.name[locale]}
        </span>
        <h3 className="relative mt-3 text-xl font-black leading-snug text-white sm:text-2xl">{business.name[locale]}</h3>
      </div>
      <div className="p-5 sm:p-6">
        <p className="min-h-12 text-sm leading-6 text-[#5e6c8b]">{business.description[locale]}</p>
        <div className="mt-5 flex items-center gap-2 text-sm font-medium text-[#687797]">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-50 text-[var(--brand)]">
            <MapPin aria-hidden="true" size={14} />
          </span>
          <span>{business.address[locale]}</span>
        </div>
        <div className="mt-5 flex items-center justify-between gap-4 border-t border-[var(--line)] pt-4 text-sm">
          <span className="inline-flex items-center gap-2 font-semibold text-[#536383]">
            <UsersRound aria-hidden="true" size={16} className="text-[var(--brand)]" strokeWidth={2.4} />
            {business.employeeCount} {copy.discovery.staffCount}
          </span>
          <span className="text-end text-xs font-bold text-[var(--brand)]">{copy.discovery.detailsSoon}</span>
        </div>
      </div>
    </article>
  );
}
