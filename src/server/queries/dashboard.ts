import { createClient } from '@/lib/supabase/server';
import {
  DEFAULT_TIME_ZONE,
  endOfLocalDay,
  parseTstzRange,
  startOfLocalDay,
  toDateISO,
  toTimeHHmm,
  toTstzRange,
} from '@/lib/time';
import type {
  AvailabilityRule,
  BusinessHourRow,
  DashboardAppointment,
  DashboardBusiness,
  DashboardEmployee,
  DashboardKpi,
  DashboardService,
  JoinRequestSummary,
} from '@/types/domain';

/**
 * Business-portal reads (TECHNICAL_DESIGN.md §4, §10.7). Replaces `lib/dashboard/*`, which was a
 * typecheck-only placeholder returning empty arrays.
 *
 * Everything here hangs off `getCurrentEmployment()`: the dashboard has no `businessId` in its
 * URL, so "which business am I managing" is answered by the caller's own ACTIVE `employees` row —
 * the same question `(business)/dashboard/layout.tsx` already asks to decide whether to redirect
 * to `/onboarding`.
 *
 * `isOwner` is threaded through rather than recomputed per screen because it gates exactly one
 * thing (§12.1): the founder decides join requests and manages the roster; every other
 * day-to-day edit is open to any ACTIVE employee.
 */

export type CurrentEmployment = {
  employeeId: string;
  businessId: string;
  profileId: string;
  isOwner: boolean;
};

export async function getCurrentEmployment(): Promise<CurrentEmployment | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('employees')
    .select('id, business_id, profile_id, businesses(owner_profile_id)')
    .eq('profile_id', user.id)
    .eq('status', 'ACTIVE')
    .order('created_at')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    employeeId: data.id,
    businessId: data.business_id,
    profileId: data.profile_id,
    isOwner: (data.businesses as { owner_profile_id: string } | null)?.owner_profile_id === user.id,
  };
}

export async function getCurrentBusinessDashboard(): Promise<DashboardBusiness | null> {
  const employment = await getCurrentEmployment();
  if (!employment) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, timezone, approval_policy, cancellation_window_hours, status')
    .eq('id', employment.businessId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    timezone: data.timezone,
    approvalPolicy: data.approval_policy,
    cancellationWindowHours: data.cancellation_window_hours,
    status: data.status,
    isOwner: employment.isOwner,
  };
}

export async function listDashboardEmployees(businessId: string): Promise<DashboardEmployee[]> {
  const supabase = await createClient();

  const [{ data, error }, { data: business }] = await Promise.all([
    supabase
      .from('employees')
      .select('id, profile_id, position_title, status, services(count)')
      .eq('business_id', businessId)
      .order('created_at'),
    supabase.from('businesses').select('owner_profile_id').eq('id', businessId).maybeSingle(),
  ]);
  if (error) throw error;

  const rows = data ?? [];
  const names = await loadNames(rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    fullName: names.get(row.id) ?? '',
    positionTitle: row.position_title,
    status: row.status,
    serviceCount: (row.services as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
    isOwner: business?.owner_profile_id === row.profile_id,
  }));
}

/**
 * Every service in the business, annotated with its owning employee.
 *
 * Reading across the whole business is a *display* concern — the services page lists them
 * grouped by staff member. Writing stays scoped to the acting employee by RLS, so seeing a
 * colleague's service here never implies being able to edit it (§4.3).
 */
export async function listDashboardServices(businessId: string): Promise<DashboardService[]> {
  const supabase = await createClient();

  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id')
    .eq('business_id', businessId);
  if (employeesError) throw employeesError;

  const employeeIds = (employees ?? []).map((row) => row.id);
  if (employeeIds.length === 0) return [];

  const [{ data, error }, names] = await Promise.all([
    supabase
      .from('services')
      .select('id, employee_id, name, price, duration_minutes, buffer_minutes, status')
      .in('employee_id', employeeIds)
      .order('name'),
    loadNames(employeeIds),
  ]);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    employeeId: row.employee_id,
    employeeName: names.get(row.employee_id) ?? '',
    name: row.name,
    price: Number(row.price),
    durationMinutes: row.duration_minutes,
    bufferMinutes: row.buffer_minutes,
    status: row.status,
  }));
}

/**
 * The appointments table, with the client's name and phone so staff can contact them.
 *
 * Two things here are not the obvious spelling, and both were found by running the query rather
 * than reading it:
 *
 * 1. **Client contact comes from `business_client_contacts` (0016), not from an embedded
 *    `profiles`.** An embed is scoped by `profiles_select`, not by `appointments_select`, so the
 *    join succeeds and returns `null` for every column — it reads as missing data rather than as
 *    a permission decision.
 * 2. **Date filtering uses `overlaps`, not `gte`/`lt`.** `slot` is a `tstzrange`; comparing it to
 *    a timestamp makes Postgres try to parse that timestamp as a range and fail with
 *    `malformed range literal`. Overlap is also the semantically right question: an appointment
 *    starting at 23:45 belongs to today's list.
 */
export async function listDashboardAppointments(
  businessId: string,
  options: { from?: Date; to?: Date } = {},
): Promise<DashboardAppointment[]> {
  const supabase = await createClient();

  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id')
    .eq('business_id', businessId);
  if (employeesError) throw employeesError;

  const employeeIds = (employees ?? []).map((row) => row.id);
  if (employeeIds.length === 0) return [];

  let query = supabase
    .from('appointments')
    .select(
      `id, employee_id, client_profile_id, slot, status,
       services(name),
       employees(businesses(timezone)),
       employee_public_profiles(full_name)`,
    )
    .in('employee_id', employeeIds);

  if (options.from && options.to) {
    query = query.overlaps('slot', toTstzRange(options.from, options.to));
  }

  const { data, error } = await query.order('slot');
  if (error) throw error;

  const rows = data ?? [];
  const contacts = await loadClientContacts(
    businessId,
    rows.map((row) => row.client_profile_id),
  );

  return rows.map((row) => {
    const timezone =
      (row.employees as { businesses: { timezone: string } | null } | null)?.businesses?.timezone ??
      DEFAULT_TIME_ZONE;
    const startsAt = parseTstzRange(row.slot)?.startsAt ?? new Date(0);
    const client = contacts.get(row.client_profile_id);

    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: (row.employee_public_profiles as { full_name: string | null } | null)?.full_name ?? '',
      clientName: client?.fullName ?? '',
      clientPhone: client?.phone ?? null,
      serviceName: (row.services as { name: string } | null)?.name ?? '',
      dateISO: toDateISO(startsAt, timezone),
      time: toTimeHHmm(startsAt, timezone),
      status: row.status,
    };
  });
}

async function loadClientContacts(
  businessId: string,
  profileIds: string[],
): Promise<Map<string, { fullName: string; phone: string | null }>> {
  const contacts = new Map<string, { fullName: string; phone: string | null }>();
  if (profileIds.length === 0) return contacts;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('business_client_contacts')
    .select('profile_id, full_name, phone')
    .eq('business_id', businessId)
    .in('profile_id', [...new Set(profileIds)]);
  if (error) throw error;

  for (const row of data ?? []) {
    if (row.profile_id) contacts.set(row.profile_id, { fullName: row.full_name ?? '', phone: row.phone });
  }
  return contacts;
}

/**
 * The overview tiles. Counted against the business's own timezone, not the server's — "today"
 * for a salon in Jerusalem is not the UTC day.
 *
 * `revenue` carries `isMock: true`: there is no payments table anywhere in §3, so it is the sum
 * of today's non-cancelled service prices and not money that has actually changed hands. The flag
 * is what stops the UI presenting it as an accounting figure.
 */
export async function listDashboardKpis(businessId: string): Promise<DashboardKpi[]> {
  const supabase = await createClient();

  const { data: business } = await supabase
    .from('businesses')
    .select('timezone')
    .eq('id', businessId)
    .maybeSingle();
  const timezone = business?.timezone ?? DEFAULT_TIME_ZONE;

  const todayISO = toDateISO(new Date(), timezone);
  const from = startOfLocalDay(todayISO, timezone);
  const to = endOfLocalDay(todayISO, timezone);

  const [employees, { data: employeeRows }] = await Promise.all([
    listDashboardEmployees(businessId),
    supabase.from('employees').select('id').eq('business_id', businessId),
  ]);

  const employeeIds = (employeeRows ?? []).map((row) => row.id);
  if (employeeIds.length === 0) {
    return [
      { id: 'appointments-today', value: 0 },
      { id: 'active-staff', value: 0 },
      { id: 'pending-approval', value: 0 },
      { id: 'revenue', value: 0, isMock: true },
    ];
  }

  // Priced here rather than by reusing listDashboardAppointments: that shape carries a service
  // *name*, and two employees may legitimately offer the same service name at different prices,
  // so keying on it would quietly mis-total. Joining the price directly avoids the question.
  const { data: today, error } = await supabase
    .from('appointments')
    .select('status, services(price)')
    .in('employee_id', employeeIds)
    // `slot` is a tstzrange — see the note on listDashboardAppointments about why this is an
    // overlap rather than a pair of timestamp comparisons.
    .overlaps('slot', toTstzRange(from, to));
  if (error) throw error;

  const rows = today ?? [];
  const live = rows.filter((row) => row.status !== 'CANCELLED');

  return [
    { id: 'appointments-today', value: live.length },
    { id: 'active-staff', value: employees.filter((employee) => employee.status === 'ACTIVE').length },
    { id: 'pending-approval', value: rows.filter((row) => row.status === 'PENDING').length },
    {
      id: 'revenue',
      value: live.reduce(
        (total, row) => total + Number((row.services as { price: number } | null)?.price ?? 0),
        0,
      ),
      isMock: true,
    },
  ];
}

/** `/dashboard/staff/requests`. Visible to all staff; only the founder may decide them (§6.8 rule 6). */
export async function listJoinRequests(businessId: string): Promise<JoinRequestSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('join_requests')
    // `profiles` is hinted with the column: join_requests references it twice (profile_id and
    // decided_by), so an unqualified embed is ambiguous and PostgREST refuses it.
    .select(
      'id, business_id, profile_id, status, created_at, businesses(name), profiles!join_requests_profile_id_fkey(full_name)',
    )
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    businessId: row.business_id,
    businessName: (row.businesses as { name: string } | null)?.name ?? '',
    profileId: row.profile_id,
    fullName: (row.profiles as { full_name: string } | null)?.full_name ?? '',
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function listBusinessHours(businessId: string): Promise<BusinessHourRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('business_hours')
    .select('id, day_of_week, opens_at, closes_at')
    .eq('business_id', businessId)
    .order('day_of_week')
    .order('opens_at');
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    dayOfWeek: row.day_of_week,
    // Postgres renders `time` as HH:MM:SS; the forms and the DDL both work in HH:mm.
    opensAt: row.opens_at.slice(0, 5),
    closesAt: row.closes_at.slice(0, 5),
  }));
}

export async function listAvailabilityRules(employeeId: string): Promise<AvailabilityRule[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('employee_availability_rules')
    .select('id, employee_id, kind, day_of_week, starts_at, ends_at, effective_range')
    .eq('employee_id', employeeId)
    .order('kind')
    .order('day_of_week', { nullsFirst: false });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const range = parseTstzRange(row.effective_range);
    return {
      id: row.id,
      employeeId: row.employee_id,
      kind: row.kind,
      dayOfWeek: row.day_of_week,
      startsAt: row.starts_at ? row.starts_at.slice(0, 5) : null,
      endsAt: row.ends_at ? row.ends_at.slice(0, 5) : null,
      effectiveFrom: range?.startsAt.toISOString() ?? null,
      effectiveTo: range?.endsAt.toISOString() ?? null,
    };
  });
}

async function loadNames(employeeIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (employeeIds.length === 0) return names;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('employee_public_profiles')
    .select('employee_id, full_name')
    .in('employee_id', employeeIds);
  if (error) throw error;

  for (const row of data ?? []) {
    if (row.employee_id) names.set(row.employee_id, row.full_name ?? '');
  }
  return names;
}
