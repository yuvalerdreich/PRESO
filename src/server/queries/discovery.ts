import { categoryPresentation } from '@/lib/i18n/categories';
import { createClient } from '@/lib/supabase/server';
import { resolvePhotoUrl } from '@/server/queries/shared';
import type {
  BusinessProfile,
  BusinessSearchFilters,
  BusinessSummary,
  Category,
  EmployeeListItem,
  EmployeeSummary,
  ServiceSummary,
} from '@/types/domain';

/**
 * Public discovery reads (TECHNICAL_DESIGN.md §5.2, §5.3, §7).
 *
 * These replace `lib/discovery/*`. The repository interface is gone rather than reimplemented:
 * §7 is explicit that server components fetch directly through `@supabase/ssr`, and the
 * interface only ever existed so a mock could be swapped in.
 *
 * Every read here is anonymous-safe. `businesses`, `employees`, `services` and `categories` all
 * grant `select` to `anon` (0010_rls.sql), and `businesses_select` hides `SUSPENDED` rows from
 * the public while still showing them to their own staff — so a suspended business disappears
 * from search without anything here filtering on `status` (§6.9).
 */

export async function listCategories(): Promise<Category[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('categories').select('id, name, slug').order('name');
  if (error) throw error;

  return (data ?? []).map((row) => {
    const { icon, name } = categoryPresentation(row.slug, row.name);
    return { id: row.id, slug: row.slug, icon, name };
  });
}

/**
 * The business grid on `/` and the `/search` results.
 *
 * `q` matches the business name **and the name of anyone who works there** — §12.22 asks for the
 * owner's name specifically, and this is a deliberate superset. The owner is always an employee
 * of their own business (§6.8 rule 3 makes the creator employee #1), so matching staff satisfies
 * §12.22 and additionally lets a client find a salon by the stylist they actually know. It also
 * avoids widening RLS: `profiles` is readable only own-row-or-admin, so an anonymous visitor
 * cannot join it — the public `employee_public_profiles` view (0015) is the only route to a name.
 */
export async function searchBusinesses(filters: BusinessSearchFilters = {}): Promise<BusinessSummary[]> {
  const supabase = await createClient();

  const q = filters.q?.trim();
  let businessIdsMatchingStaff: string[] = [];

  if (q) {
    const { data: staff, error: staffError } = await supabase
      .from('employee_public_profiles')
      .select('business_id')
      .ilike('full_name', `%${q}%`);
    if (staffError) throw staffError;

    businessIdsMatchingStaff = [...new Set((staff ?? []).map((row) => row.business_id).filter(Boolean))] as string[];
  }

  let query = supabase
    .from('businesses')
    .select('id, name, description, category_id, area, address, phone, photo_paths, approval_policy, categories!inner(slug)');

  if (q) {
    const clauses = [`name.ilike.%${q}%`];
    if (businessIdsMatchingStaff.length > 0) {
      clauses.push(`id.in.(${businessIdsMatchingStaff.join(',')})`);
    }
    query = query.or(clauses.join(','));
  }

  // A category **slug**, not an id — ids differ per environment.
  if (filters.category) query = query.eq('categories.slug', filters.category);
  if (filters.area) query = query.ilike('area', `%${filters.area}%`);

  const { data, error } = await query.order('name');
  if (error) throw error;

  const rows = data ?? [];
  const staffByBusiness = await loadStaffAvatars(rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    area: row.area,
    address: row.address,
    description: row.description ?? '',
    photoUrl: resolvePhotoUrl(supabase, row.photo_paths),
    employeeCount: staffByBusiness.get(row.id)?.length ?? 0,
    employeeAvatarUrls: (staffByBusiness.get(row.id) ?? []).flatMap((s) => (s.avatarUrl ? [s.avatarUrl] : [])),
    approvalPolicy: row.approval_policy,
  }));
}

export async function getBusinessProfile(businessId: string): Promise<BusinessProfile | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('businesses')
    .select(
      'id, owner_profile_id, name, description, category_id, area, address, phone, timezone, photo_paths, approval_policy, cancellation_window_hours',
    )
    .eq('id', businessId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const staff = (await loadStaffAvatars([businessId])).get(businessId) ?? [];

  return {
    id: data.id,
    name: data.name,
    categoryId: data.category_id,
    area: data.area,
    address: data.address,
    description: data.description ?? '',
    photoUrl: resolvePhotoUrl(supabase, data.photo_paths),
    employeeCount: staff.length,
    employeeAvatarUrls: staff.flatMap((s) => (s.avatarUrl ? [s.avatarUrl] : [])),
    approvalPolicy: data.approval_policy,
    phone: data.phone,
    timezone: data.timezone,
    cancellationWindowHours: data.cancellation_window_hours,
    ownerProfileId: data.owner_profile_id,
  };
}

/** The staff picker. Only ACTIVE positions — an INACTIVE employee is not bookable or listable. */
export async function listBusinessEmployees(businessId: string): Promise<EmployeeSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('employee_public_profiles')
    .select('employee_id, business_id, full_name, position_title, avatar_url')
    .eq('business_id', businessId)
    .eq('status', 'ACTIVE')
    .order('position_title');
  if (error) throw error;

  return (data ?? []).map(toEmployeeSummary);
}

export async function getBusinessEmployee(
  businessId: string,
  employeeId: string,
): Promise<EmployeeSummary | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('employee_public_profiles')
    .select('employee_id, business_id, full_name, position_title, avatar_url')
    .eq('business_id', businessId)
    .eq('employee_id', employeeId)
    .eq('status', 'ACTIVE')
    .maybeSingle();
  if (error) throw error;

  return data ? toEmployeeSummary(data) : null;
}

/** Looked up by id alone — what `POST /api/appointments` resolves from its `employeeId`. */
export async function getEmployeeById(employeeId: string): Promise<EmployeeSummary | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('employee_public_profiles')
    .select('employee_id, business_id, full_name, position_title, avatar_url')
    .eq('employee_id', employeeId)
    .maybeSingle();
  if (error) throw error;

  return data ? toEmployeeSummary(data) : null;
}

/**
 * `GET /api/employees/[id]/services` (§5.3) and the booking page's service list.
 *
 * Keyed by **employee**, never by business — PDF §8 rule 8 and §12.9. The `businessId` argument
 * is a containment check, not a filter: it rejects a mismatched pair rather than widening the
 * result, so a URL pairing one business with another's employee 404s instead of quietly
 * rendering the other business's services.
 */
export async function listEmployeeServices(
  businessId: string,
  employeeId: string,
  options: { activeOnly?: boolean } = {},
): Promise<ServiceSummary[]> {
  const supabase = await createClient();

  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('id')
    .eq('id', employeeId)
    .eq('business_id', businessId)
    .maybeSingle();
  if (employeeError) throw employeeError;
  if (!employee) return [];

  return listServicesForEmployee(employeeId, options);
}

export async function listServicesForEmployee(
  employeeId: string,
  { activeOnly = true }: { activeOnly?: boolean } = {},
): Promise<ServiceSummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from('services')
    .select('id, employee_id, name, description, price, duration_minutes, buffer_minutes, status')
    .eq('employee_id', employeeId);

  if (activeOnly) query = query.eq('status', 'ACTIVE');

  const { data, error } = await query.order('name');
  if (error) throw error;

  return (data ?? []).map(toServiceSummary);
}

/** Looked up by id alone — the other half of what `POST /api/appointments` resolves. */
export async function getServiceById(serviceId: string): Promise<ServiceSummary | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('services')
    .select('id, employee_id, name, description, price, duration_minutes, buffer_minutes, status')
    .eq('id', serviceId)
    .maybeSingle();
  if (error) throw error;

  return data ? toServiceSummary(data) : null;
}

/**
 * `GET /api/businesses/[id]/employees` (§5.3) — the roster shape, with `serviceCount`.
 *
 * The count is what lets the UI act on §12.10: an employee with zero services is selectable but
 * unbookable, and the list can say so instead of rendering an unexplained empty service list.
 */
export async function listBusinessEmployeeItems(businessId: string): Promise<EmployeeListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('employees')
    .select('id, profile_id, position_title, status, services(count)')
    .eq('business_id', businessId)
    .order('position_title');
  if (error) throw error;

  const rows = data ?? [];
  const names = await loadEmployeeNames(rows.map((row) => row.id));

  return rows.map((row) => ({
    id: row.id,
    profileId: row.profile_id,
    fullName: names.get(row.id) ?? '',
    positionTitle: row.position_title,
    status: row.status,
    // PostgREST returns an aggregate embed as a one-element array of `{ count }`.
    serviceCount: (row.services as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

type EmployeeViewRow = {
  employee_id: string | null;
  business_id: string | null;
  full_name: string | null;
  position_title: string | null;
  avatar_url: string | null;
};

/**
 * Every column of `employee_public_profiles` is nullable in the generated types — a view has no
 * NOT NULL metadata for PostgREST to report, even though the underlying columns are not null.
 * The coalescing here is that type artefact, not a real possibility.
 */
function toEmployeeSummary(row: EmployeeViewRow): EmployeeSummary {
  return {
    id: row.employee_id ?? '',
    businessId: row.business_id ?? '',
    fullName: row.full_name ?? '',
    positionTitle: row.position_title ?? '',
    avatarUrl: row.avatar_url ?? '',
  };
}

function toServiceSummary(row: {
  id: string;
  employee_id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  buffer_minutes: number;
  status: ServiceSummary['status'];
}): ServiceSummary {
  return {
    id: row.id,
    employeeId: row.employee_id,
    name: row.name,
    description: row.description ?? '',
    price: Number(row.price),
    durationMinutes: row.duration_minutes,
    bufferMinutes: row.buffer_minutes,
    status: row.status,
  };
}

/**
 * Staff names and photos for a set of businesses, in one round trip rather than one per business.
 * The business grid renders a stack of avatars per card, so the alternative is an N+1 over the
 * whole result page.
 */
async function loadStaffAvatars(
  businessIds: string[],
): Promise<Map<string, { fullName: string; avatarUrl: string }[]>> {
  const grouped = new Map<string, { fullName: string; avatarUrl: string }[]>();
  if (businessIds.length === 0) return grouped;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('employee_public_profiles')
    .select('business_id, full_name, avatar_url')
    .in('business_id', businessIds)
    .eq('status', 'ACTIVE');
  if (error) throw error;

  for (const row of data ?? []) {
    if (!row.business_id) continue;
    const list = grouped.get(row.business_id) ?? [];
    list.push({ fullName: row.full_name ?? '', avatarUrl: row.avatar_url ?? '' });
    grouped.set(row.business_id, list);
  }

  return grouped;
}

async function loadEmployeeNames(employeeIds: string[]): Promise<Map<string, string>> {
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
