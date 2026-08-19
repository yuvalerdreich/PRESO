'use client';

import Link from 'next/link';
import { Check } from 'lucide-react';

import type { EmployeeSummary } from '@/types/domain';

export function EmployeeCard({
  employee,
  href,
  selected,
}: {
  employee: EmployeeSummary;
  href: string;
  selected: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? 'true' : undefined}
      className={`relative flex flex-col items-center gap-2 rounded-2xl border px-6 py-4 text-center transition-colors ${
        selected
          ? 'border-[var(--brand)] bg-[var(--soft-violet)]'
          : 'border-[var(--line)] bg-white hover:border-[var(--brand)]/40'
      }`}
    >
      <span className="relative">
        {/* avatarUrl is '' for a staff member with no photo (discovery.ts maps a null
            avatar_url to ''), and <img src=""> re-requests the page. Fall back to the
            initial so the circle keeps its size instead of collapsing the layout. */}
        {employee.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- mock photo host isn't in next.config's image remotePatterns
          <img
            src={employee.avatarUrl}
            alt=""
            className="h-14 w-14 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--soft-violet)] text-lg font-bold text-[var(--brand-deep)]"
          >
            {employee.fullName.trim().charAt(0)}
          </span>
        )}
        {selected ? (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand)] text-white">
            <Check className="h-3 w-3" aria-hidden="true" />
          </span>
        ) : null}
      </span>
      <span className="text-sm font-bold text-[var(--foreground)]">{employee.fullName}</span>
      <span className="text-xs text-[var(--brand-deep)]">{employee.positionTitle}</span>
    </Link>
  );
}
