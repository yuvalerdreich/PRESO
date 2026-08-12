'use client';

import { EmployeeCard } from '@/components/discovery/employee-card';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { BusinessEmployee } from '@/types/domain';

export function EmployeeList({ employees }: { employees: BusinessEmployee[] }) {
  const { copy } = useLanguage();

  return (
    <section className="mt-12" aria-labelledby="business-team-heading">
      <div className="max-w-2xl">
        <p className="text-sm font-bold text-[var(--brand)]">{copy.businessProfile.businessDetails}</p>
        <h2 id="business-team-heading" className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
          {copy.businessProfile.team}
        </h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)] sm:text-base">{copy.businessProfile.teamDescription}</p>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {employees.map((employee) => <EmployeeCard key={employee.id} employee={employee} />)}
      </div>
    </section>
  );
}
