import { redirect } from 'next/navigation';

import { DashboardDetailsPage } from '@/components/business/dashboard-details-page';
// `business-entry`'s `listCategories`, not `discovery`'s: this is the flat `{id, slug, name}` the
// create wizard's own category picker uses, where discovery's carries a `LocalizedText` name for
// the public chips.
import { listCategories } from '@/server/queries/business-entry';
import { getCurrentBusinessDashboard } from '@/server/queries/dashboard';

/**
 * `/businesses/manage/details` — the business's own settings (§10.7, §12.53).
 *
 * Everything the form edits is one `businesses` row, and `getCurrentBusinessDashboard()` already
 * resolves it through the caller's ACTIVE `employees` row — the same question the shell's layout
 * asks. So there is no business id in the URL, and nothing to forge.
 */
export default async function BusinessSettingsRoute() {
  const [business, categories] = await Promise.all([getCurrentBusinessDashboard(), listCategories()]);
  if (!business) redirect('/businesses');

  return <DashboardDetailsPage business={business} categories={categories} />;
}
