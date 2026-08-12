'use client';

import Link from 'next/link';
import { ArrowUpLeft, Sparkles } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { BusinessEmployee } from '@/types/domain';

const avatarStyles = {
  violet: 'from-violet-600 to-indigo-950',
  rose: 'from-rose-400 to-fuchsia-800',
  amber: 'from-amber-300 to-orange-700',
  teal: 'from-teal-400 to-cyan-800',
} as const;

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2);
}

export function EmployeeCard({ employee }: { employee: BusinessEmployee }) {
  const { locale, copy } = useLanguage();
  const employeeName = employee.name[locale];

  return (
    <article className="group rounded-[1.6rem] border border-[var(--line)] bg-white p-5 shadow-[0_10px_28px_rgba(37,42,92,.06)] transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_18px_35px_rgba(69,54,180,.12)] sm:p-6">
      <div className="flex items-start gap-4">
        <span className={`inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-base font-black text-white shadow-lg ${avatarStyles[employee.avatarVariant]}`}>
          {initials(employeeName)}
        </span>
        <div className="min-w-0">
          <p className="text-lg font-black tracking-tight">{employeeName}</p>
          <p className="mt-1 text-sm font-bold text-[var(--brand)]">{employee.position[locale]}</p>
        </div>
      </div>
      <p className="mt-5 min-h-12 text-sm leading-6 text-[#61708d]">{employee.introduction[locale]}</p>
      <Link
        href={`/b/${employee.businessId}/e/${employee.id}`}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--soft-violet)] px-3 py-2 text-sm font-bold text-[var(--brand)] transition hover:bg-violet-100 hover:text-[var(--brand-deep)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
      >
        <Sparkles aria-hidden="true" size={15} />
        {copy.businessProfile.viewEmployee} {employeeName}
        <ArrowUpLeft aria-hidden="true" size={15} />
      </Link>
    </article>
  );
}
