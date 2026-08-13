'use client';

import Image from 'next/image';
import { Check, MapPin, Tag } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { JoinableBusiness } from '@/types/business-entry';

const coverImages = {
  studio: '/images/discovery/studio-cover.png',
  clinic: '/images/discovery/clinic-cover.png',
  fitness: '/images/discovery/fitness-cover.png',
} as const;

export function JoinableBusinessList({ businesses, selectedId, onSelect }: { businesses: JoinableBusiness[]; selectedId: string; onSelect: (businessId: string) => void }) {
  const { locale } = useLanguage();

  return (
    <div className="grid gap-3">
      {businesses.map((business) => {
        const selected = business.id === selectedId;
        return (
          <button key={business.id} type="button" onClick={() => onSelect(business.id)} className={`relative overflow-hidden rounded-2xl border p-4 text-start transition focus-visible:outline-2 focus-visible:outline-[var(--brand)] ${selected ? 'border-violet-300 bg-violet-50 shadow-[0_10px_24px_rgba(69,54,180,.12)]' : 'border-[var(--line)] bg-white hover:border-violet-200 hover:bg-[#fcfbff]'}`}>
            <div className="flex items-center gap-3">
              <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-[var(--brand-dark)]"><Image src={coverImages[business.imageVariant]} alt="" fill sizes="56px" className="object-cover" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-black">{business.name[locale]}</span>
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-[var(--muted)]"><span className="inline-flex items-center gap-1"><Tag aria-hidden="true" size={13} className="text-[var(--brand)]" />{business.category.name[locale]}</span><span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" size={13} className="text-[var(--brand)]" />{business.area.name[locale]}</span></span>
              </span>
              {selected && <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-white"><Check aria-hidden="true" size={15} strokeWidth={3} /></span>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
