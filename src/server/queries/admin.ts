import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/server/guards';
import type { AdminBusiness, AdminUser, ReportSummary } from '@/types/domain';

/**
 * Admin console reads (TECHNICAL_DESIGN.md §4.5, §10.1).
 *
 * These call `requireAdmin()` first even though RLS already restricts every one of these tables
 * to `is_admin()`. That is the §7.3 defence-in-depth pattern, and it buys a real difference in
 * behaviour rather than duplicated safety: without the guard a non-admin gets an empty list and
 * a blank screen, with it they get a `FORBIDDEN` the layout can redirect on. RLS decides what is
 * *possible*; the guard decides what is *reported*.
 *
 * Still the RLS-bound client throughout — `lib/supabase/admin.ts` is for webhooks and cron only,
 * and an admin console is neither.
 */

export async function listUsers(options: { q?: string } = {}): Promise<AdminUser[]> {
  await requireAdmin();
  const supabase = await createClient();

  let query = supabase.from('profiles').select('id, full_name, account_type, status, created_at');
  if (options.q) query = query.ilike('full_name', `%${options.q}%`);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    accountType: row.account_type,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function listBusinesses(options: { q?: string } = {}): Promise<AdminBusiness[]> {
  await requireAdmin();
  const supabase = await createClient();

  let query = supabase
    .from('businesses')
    .select('id, name, area, status, created_at, categories(name), profiles(full_name), employees(count)');
  if (options.q) query = query.ilike('name', `%${options.q}%`);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    ownerName: (row.profiles as { full_name: string } | null)?.full_name ?? '',
    categoryName: (row.categories as { name: string } | null)?.name ?? '',
    area: row.area,
    status: row.status,
    employeeCount: (row.employees as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
    createdAt: row.created_at,
  }));
}

export async function listReports(options: { status?: ReportSummary['status'] } = {}): Promise<ReportSummary[]> {
  await requireAdmin();
  const supabase = await createClient();

  let query = supabase
    .from('reports')
    .select('id, target_type, target_id, description, status, resolution_note, created_at, profiles(full_name)');
  if (options.status) query = query.eq('status', options.status);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    reporterName: (row.profiles as { full_name: string } | null)?.full_name ?? '',
    description: row.description,
    status: row.status,
    resolutionNote: row.resolution_note,
    createdAt: row.created_at,
  }));
}

/**
 * The audit trail (§8.5). Deliberately separate from `logger.ts`: logs are diagnostics and are
 * not the audit trail, while these rows are durable, admin-visible and written by triggers.
 */
export async function listAuditLog(limit = 100): Promise<
  { id: string; action: string; entity: string; entityId: string | null; createdAt: string }[]
> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audit_log')
    .select('id, action, entity, entity_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    entity: row.entity,
    entityId: row.entity_id,
    createdAt: row.created_at,
  }));
}
