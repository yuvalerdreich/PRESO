'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, MapPin, Phone } from 'lucide-react';

import { EmployeeList } from '@/components/public/employee-list';
import { EmployeeServiceList } from '@/components/public/employee-service-list';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { BusinessProfile as BusinessProfileType, Category, EmployeeSummary, ServiceSummary } from '@/types/domain';

export function BusinessProfile({
  business,
  category,
  employees,
  selectedEmployee,
  services,
}: {
  business: BusinessProfileType;
  category?: Category;
  employees: EmployeeSummary[];
  selectedEmployee: EmployeeSummary;
  services: ServiceSummary[];
}) {
  const { copy, locale, direction } = useLanguage();
  const BackArrow = direction === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="flex w-fit items-center gap-2 self-end rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:border-[var(--brand)]/40"
      >
        {copy.businessProfile.backToList}
        <BackArrow className="h-4 w-4" aria-hidden="true" />
      </Link>

      <div className="relative aspect-[21/9] w-full overflow-hidden rounded-3xl bg-[var(--soft-violet)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- mock photo host isn't in next.config's image remotePatterns */}
        <img src={business.photoUrl} alt="" className="h-full w-full object-cover grayscale" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-6">
          {category ? (
            <span className="w-fit self-end rounded-full bg-[var(--brand)] px-3 py-1 text-xs font-semibold text-white">
              {category.name[locale]}
            </span>
          ) : null}
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{business.name[locale]}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/90">
            <span className="flex items-center gap-1.5">
              {business.phone}
              <Phone className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="flex items-center gap-1.5">
              {business.address[locale]}
              <MapPin className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>

      <EmployeeList businessId={business.id} employees={employees} selectedEmployeeId={selectedEmployee.id} />
      <EmployeeServiceList employee={selectedEmployee} services={services} />
    </div>
  );
}
