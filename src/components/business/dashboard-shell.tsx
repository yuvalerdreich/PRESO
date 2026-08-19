import type { ReactNode } from 'react';

import { DashboardHeader } from '@/components/business/dashboard-header';
import type { DashboardBusiness, DashboardNavCounts } from '@/types/domain';

/**
 * The chrome every `/dashboard/**` screen renders inside: the business header and section nav,
 * then the screen itself. Rendered from `(business)/dashboard/layout.tsx`, so the header survives
 * navigation between sections instead of each page re-declaring it.
 *
 * The page width matches `/businesses` — the screen a business user arrives from — so "ניהול העסק"
 * doesn't shift the layout under them.
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
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <DashboardHeader business={business} counts={counts} />
      {children}
    </div>
  );
}
