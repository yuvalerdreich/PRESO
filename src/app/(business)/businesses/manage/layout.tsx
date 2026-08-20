import { redirect } from 'next/navigation';

import { DashboardShell } from '@/components/business/dashboard-shell';
import { AppError } from '@/lib/errors';
import { requireSession } from '@/server/guards';
import { getCurrentBusinessDashboard, getDashboardNavCounts } from '@/server/queries/dashboard';

export default async function DashboardLayout({ children }: LayoutProps<'/businesses/manage'>) {
  try {
    await requireSession();
  } catch (error) {
    if (error instanceof AppError) redirect('/login');
    throw error;
  }

  // No ACTIVE employees row means there is no business to manage yet, and `getCurrentBusinessDashboard`
  // resolves the business *through* that row — so a null here is the same "nothing to manage" case
  // `hasActiveEmployment()` used to answer on its own. The target tree sends that case to
  // `/onboarding`, but that screen is unbuilt (punch-list #3) and was a dead end — `/businesses` is
  // the built screen offering the same two ways out (§12.41).
  const business = await getCurrentBusinessDashboard();
  if (!business) redirect('/businesses');

  const counts = await getDashboardNavCounts(business.id);

  return (
    <DashboardShell business={business} counts={counts}>
      {children}
    </DashboardShell>
  );
}
