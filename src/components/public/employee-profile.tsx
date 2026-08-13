'use client';

import Link from 'next/link';
import { ArrowLeft, Building2, MapPinned, Sparkles, Tag } from 'lucide-react';

import { EmployeeServiceList } from '@/components/public/employee-service-list';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { BusinessEmployee, BusinessProfile, EmployeeService } from '@/types/domain';

const avatarStyles = {
  violet: 'from-violet-600 to-indigo-950',
  rose: 'from-rose-400 to-fuchsia-800',
  amber: 'from-amber-300 to-orange-700',
  teal: 'from-teal-400 to-cyan-800',
} as const;

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2);
}

type EmployeeProfileProps = {
  business: BusinessProfile;
  employee: BusinessEmployee;
  services: EmployeeService[];
};

export function EmployeeProfile({ business, employee, services }: EmployeeProfileProps) {
  const { locale, copy } = useLanguage();
  const employeeName = employee.name[locale];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-7 sm:px-6 sm:py-10 lg:py-12">
      <Link href={`/b/${business.id}`} className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-[var(--brand)] transition hover:bg-[var(--soft-violet)] hover:text-[var(--brand-deep)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]">
        <ArrowLeft aria-hidden="true" size={17} className="rtl:rotate-180" />
        {copy.businessProfile.backToBusiness}
      </Link>

      <section className="mt-4 overflow-hidden rounded-[2rem] border border-violet-100 bg-[radial-gradient(circle_at_88%_5%,rgba(157,122,255,.32),transparent_28%),linear-gradient(135deg,#171e48,#38206f)] p-6 text-white shadow-[0_20px_44px_rgba(36,32,99,.18)] sm:p-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <span className={`inline-flex size-20 items-center justify-center rounded-[1.6rem] bg-gradient-to-br text-2xl font-black text-white shadow-xl ${avatarStyles[employee.avatarVariant]}`}>
            {initials(employeeName)}
          </span>
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold text-violet-200"><Building2 aria-hidden="true" size={16} />{business.name[locale]}</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{employeeName}</h1>
            <p className="mt-2 text-base font-bold text-violet-100">{employee.position[locale]}</p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-indigo-100">{employee.introduction[locale]}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-violet-100">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/10 px-3 py-1.5"><Tag aria-hidden="true" size={13} />{business.category.name[locale]}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/10 px-3 py-1.5"><MapPinned aria-hidden="true" size={13} />{business.area.name[locale]}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="employee-services-heading">
        <div className="max-w-2xl">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-[var(--brand)]"><Sparkles aria-hidden="true" size={16} />{copy.businessProfile.businessDetails}</p>
          <h2 id="employee-services-heading" className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{copy.businessProfile.employeeServices} {employeeName}</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)] sm:text-base">{copy.businessProfile.employeeServicesDescription}</p>
        </div>
        <EmployeeServiceList services={services} />
      </section>
      <p className="mt-10 text-center text-xs font-semibold text-[var(--muted)]">{copy.businessProfile.mockNotice}</p>
    </main>
  );
}
