'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { DashboardHeader } from '@/components/business/dashboard-header';
import { actionButton } from '@/components/common/button-styles';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { DashboardBusiness, DashboardNavCounts } from '@/types/domain';

/**
 * The chrome every `/businesses/manage/**` screen renders inside: a link back to "העסקים שלי" (the
 * screen a business user arrives from), the business header and section nav, then the screen
 * itself. Rendered from `(business)/businesses/manage/layout.tsx`, so all three survive navigation
 * between sections instead of each page re-declaring them.
 *
 * The back link is the same shape `AppointmentsPanel`'s `backHref` uses: a filled pill, `w-fit` so
 * it sits at the block's inline-start edge rather than stretching — the right edge in RTL, above the
 * business name, exactly where "ניהול העסק" needs a way out back to the list it came from.
 *
 * The page width matches `/businesses` so "ניהול העסק" doesn't shift the layout under them.
 */
export function DashboardShell({
  business,
  counts,
  children,
}: {
  business: DashboardBusiness;
  counts: DashboardNavCounts;
  children: ReactNode;
}) {
  const { copy, direction } = useLanguage();
  const BackArrow = direction === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <Link href="/businesses" className={`${actionButton} w-fit rounded-full px-4 py-2 text-sm`}>
        <BackArrow className="h-4 w-4" aria-hidden="true" />
        {copy.dashboard.backToBusinesses}
      </Link>
      <DashboardHeader business={business} counts={counts} />
      {children}
    </div>
  );
}
