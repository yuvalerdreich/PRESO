import { AdminReportsPage } from '@/components/admin/admin-reports-page';
import { listReports } from '@/server/queries/admin';

/**
 * `/admin/reports` (TECHNICAL_DESIGN.md §12.76) — the moderation queue: reports filed by users
 * against a business, a user, an appointment, or the site in general (`targetType: 'GENERAL'`,
 * filed by the nav sidebar's "נתקלת בבעיה?" button). `(admin)/layout.tsx` already gates the whole
 * group on `requireAdmin()`; `listReports()` calls it again itself (§7.3 defence-in-depth).
 */
export default async function AdminReportsRoute() {
  const reports = await listReports();

  return <AdminReportsPage reports={reports} />;
}
