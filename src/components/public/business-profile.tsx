'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Building2, MapPin, MapPinned, Phone, Tag, UsersRound } from 'lucide-react';

import { BusinessHours } from '@/components/public/business-hours';
import { EmployeeList } from '@/components/public/employee-list';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { BusinessEmployee, BusinessProfile as BusinessProfileData } from '@/types/domain';

const coverImages = {
  studio: '/images/discovery/studio-cover.png',
  clinic: '/images/discovery/clinic-cover.png',
  fitness: '/images/discovery/fitness-cover.png',
} as const;

type BusinessProfileProps = {
  business: BusinessProfileData;
  employees: BusinessEmployee[];
};

export function BusinessProfile({ business, employees }: BusinessProfileProps) {
  const { locale, copy } = useLanguage();

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-7 sm:px-6 sm:py-10 lg:py-12">
      <Link href="/search" className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-[var(--brand)] transition hover:bg-[var(--soft-violet)] hover:text-[var(--brand-deep)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]">
        <ArrowLeft aria-hidden="true" size={17} className="rtl:rotate-180" />
        {copy.businessProfile.backToSearch}
      </Link>

      <section className="relative isolate mt-4 overflow-hidden rounded-[2rem] bg-[var(--brand-dark)] p-6 text-white shadow-[0_22px_48px_rgba(34,37,88,.2)] sm:p-9 lg:p-10">
        <Image
          src={coverImages[business.imageVariant]}
          alt=""
          fill
          priority
          sizes="(min-width: 1280px) 1280px, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(9,11,31,.92)_4%,rgba(19,22,55,.77)_50%,rgba(19,20,47,.36)_100%)]" />
        <div className="pointer-events-none absolute -end-20 -top-24 size-80 rounded-full border border-white/15" />
        <div className="pointer-events-none absolute -bottom-36 -start-16 size-72 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative max-w-3xl">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-bold text-violet-100 backdrop-blur-sm"><Tag aria-hidden="true" size={14} />{business.category.name[locale]}</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-bold text-violet-100 backdrop-blur-sm"><MapPinned aria-hidden="true" size={14} />{business.area.name[locale]}</span>
          </div>
          <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">{business.name[locale]}</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-indigo-100 sm:text-lg sm:leading-8">{business.description[locale]}</p>
          <div className="mt-6 flex flex-wrap gap-2.5 text-sm font-semibold text-indigo-50">
            <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm"><MapPin aria-hidden="true" size={16} />{business.address[locale]}</span>
            <span className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-sm"><UsersRound aria-hidden="true" size={16} />{business.employeeCount} {copy.discovery.staffCount}</span>
          </div>
        </div>
      </section>

      <section className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,.65fr)]">
        <article className="rounded-[1.6rem] border border-[var(--line)] bg-white p-5 shadow-[0_12px_30px_rgba(37,42,92,.06)] sm:p-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-10 items-center justify-center rounded-2xl bg-violet-50 text-[var(--brand)]"><Building2 aria-hidden="true" size={19} strokeWidth={2.3} /></span>
            <h2 className="text-xl font-black tracking-tight">{copy.businessProfile.businessDetails}</h2>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-[#faf9ff] p-4">
              <MapPin aria-hidden="true" size={16} className="text-[var(--brand)]" />
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{copy.businessProfile.address}</p>
              <p className="mt-1.5 text-sm font-semibold leading-6">{business.address[locale]}</p>
            </div>
            <div className="rounded-2xl bg-[#faf9ff] p-4">
              <MapPinned aria-hidden="true" size={16} className="text-[var(--brand)]" />
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{copy.businessProfile.area}</p>
              <p className="mt-1.5 text-sm font-semibold leading-6">{business.area.name[locale]}</p>
            </div>
            <div className="rounded-2xl bg-[#faf9ff] p-4">
              <Phone aria-hidden="true" size={16} className="text-[var(--brand)]" />
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{copy.businessProfile.phone}</p>
              <a href={`tel:${business.phone}`} className="mt-1.5 inline-flex text-sm font-bold text-[var(--brand)] hover:text-[var(--brand-deep)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]">{business.phone}</a>
            </div>
          </div>
        </article>
        <BusinessHours hours={business.hours} />
      </section>

      <EmployeeList employees={employees} />
      <p className="mt-10 text-center text-xs font-semibold text-[var(--muted)]">{copy.businessProfile.mockNotice}</p>
    </main>
  );
}
