import { createClient } from '@/lib/supabase/server';
import { parseTstzRange, toDateISO, toTimeHHmm } from '@/lib/time';
import { requireAdmin } from '@/server/guards';
import type { AdminBusiness, AdminUser, ReportSummary } from '@/types/domain';
import type { Database } from '@/types/database.types';

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

  let query = supabase.from('profiles').select('id, full_name, phone, account_type, status, created_at');
  if (options.q) query = query.ilike('full_name', `%${options.q}%`);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
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

  const rows = data ?? [];
  const targetLabels = await resolveReportTargetLabels(supabase, rows);

  return rows.map((row) => ({
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    targetLabel: row.target_id ? (targetLabels.get(`${row.target_type}:${row.target_id}`) ?? null) : null,
    reporterName: (row.profiles as { full_name: string } | null)?.full_name ?? '',
    description: row.description,
    status: row.status,
    resolutionNote: row.resolution_note,
    createdAt: row.created_at,
  }));
}

/**
 * `reports.target_id` (§3.11, §12.76) carries no foreign key — the target is polymorphic across
 * businesses, profiles and appointments — so PostgREST can embed none of it directly. This groups
 * the page's rows by `target_type`, runs one batched lookup per type, and keys the result
 * `"TYPE:id"` so an (astronomically unlikely) id collision across two types can't cross-label a
 * row. GENERAL rows have no `target_id` and never appear in any of the three id lists.
 */
async function resolveReportTargetLabels(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: { target_type: Database['public']['Enums']['report_target_type']; target_id: string | null }[],
): Promise<Map<string, string>> {
  const idsOf = (type: Database['public']['Enums']['report_target_type']) => [
    ...new Set(rows.filter((row) => row.target_type === type && row.target_id).map((row) => row.target_id!)),
  ];

  const businessIds = idsOf('BUSINESS');
  const profileIds = idsOf('PROFILE');
  const appointmentIds = idsOf('APPOINTMENT');

  const labels = new Map<string, string>();

  if (businessIds.length > 0) {
    const { data } = await supabase.from('businesses').select('id, name').in('id', businessIds);
    for (const business of data ?? []) labels.set(`BUSINESS:${business.id}`, business.name);
  }

  if (profileIds.length > 0) {
    const { data } = await supabase.from('profiles').select('id, full_name').in('id', profileIds);
    for (const profile of data ?? []) labels.set(`PROFILE:${profile.id}`, profile.full_name);
  }

  if (appointmentIds.length > 0) {
    const { data } = await supabase
      .from('appointments')
      .select('id, slot, services(name), employees(businesses(name, timezone))')
      .in('id', appointmentIds);

    for (const appointment of (data ?? []) as unknown as {
      id: string;
      slot: unknown;
      services: { name: string } | null;
      employees: { businesses: { name: string; timezone: string } | null } | null;
    }[]) {
      const businessName = appointment.employees?.businesses?.name ?? '';
      const timezone = appointment.employees?.businesses?.timezone;
      const serviceName = appointment.services?.name ?? '';
      const range = timezone ? parseTstzRange(appointment.slot) : null;
      const when = range ? `${toDateISO(range.startsAt, timezone!)} ${toTimeHHmm(range.startsAt, timezone!)}` : '';

      labels.set(`APPOINTMENT:${appointment.id}`, [businessName, serviceName, when].filter(Boolean).join(' · '));
    }
  }

  return labels;
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
