'use client';

import { EmployeeCard } from '@/components/public/employee-card';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { EmployeeSummary } from '@/types/domain';

export function EmployeeList({
  businessId,
  employees,
  selectedEmployeeId,
}: {
  businessId: string;
  employees: EmployeeSummary[];
  selectedEmployeeId: string;
}) {
  const { copy } = useLanguage();

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">{copy.businessProfile.chooseStaffTitle}</h2>
          <p className="text-sm text-[var(--muted)]">{copy.businessProfile.chooseStaffSubtitle}</p>
        </div>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-semibold text-white">
          1
        </span>
      </div>

      <div className="flex flex-wrap gap-4">
        {employees.map((employee) => (
          <EmployeeCard
            key={employee.id}
            employee={employee}
            href={`/b/${businessId}/e/${employee.id}`}
            selected={employee.id === selectedEmployeeId}
          />
        ))}
      </div>
    </section>
  );
}
