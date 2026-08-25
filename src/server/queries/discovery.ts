import { createClient } from '@/lib/supabase/server';
import type { BusinessSearchQuery } from '@/lib/validation/search';
import { getNextAvailable } from '@/server/queries/availability';
import { loadViewerBusinessRelations, resolvePhotoUrl } from '@/server/queries/shared';
import type {
  BusinessProfile,
  BusinessSearchFilters,
  BusinessSearchResult,
  BusinessSearchResultItem,
  BusinessSummary,
  Category,
  CategoryIconId,
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

// The finite set of Lucide components category-chips.tsx actually renders (types/domain.ts's
// CategoryIconId). Not a per-category override — every row goes through the same check — just a
// guard against `categories.icon` (0028_categories_db_driven.sql) holding something the UI has no
// component for, the same way a malformed status would fall back rather than crash.
const CATEGORY_ICON_IDS = new Set<CategoryIconId>([
  'graduation-cap',
  'stethoscope',
  'dumbbell',
  'sparkles',
  'scissors',
]);
const DEFAULT_CATEGORY_ICON: CategoryIconId = 'sparkles';

export async function listCategories(): Promise<Category[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('categories').select('id, name, slug, icon').order('name');
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    icon: CATEGORY_ICON_IDS.has(row.icon as CategoryIconId) ? (row.icon as CategoryIconId) : DEFAULT_CATEGORY_ICON,
  }));
}

/**
 * Every city that currently has a business, for the search form's area `<select>`.
 *
 * Derived from the businesses themselves rather than kept as a lookup table: the option list can
 * then never offer a city with nothing behind it, and RLS already hides suspended businesses from
 * the public, so their cities drop out with them.
 */
export async function listBusinessAreas(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('businesses').select('area').order('area');
  if (error) throw error;

  return [...new Set((data ?? []).map((row) => row.area?.trim()).filter((area): area is string => !!area))];
}

/**
 * The unpaginated business search — kept for its own real test coverage
 * (`tests/int/queries-public.test.ts`) and as the simpler of the two search reads, but **no UI
 * calls this any more**. `/` and `/search` moved to `searchBusinessesPaged()` below: this
 * function has no `LIMIT`, so every business matching the filter travelled to the browser on
 * every page load regardless of how many actually did.
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
  const [staffByBusiness, relations] = await Promise.all([
    loadStaffAvatars(rows.map((row) => row.id)),
    loadViewerBusinessRelations(supabase, rows.map((row) => row.id)),
  ]);

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
    employeeNames: (staffByBusiness.get(row.id) ?? []).map((s) => s.fullName).filter(Boolean),
    approvalPolicy: row.approval_policy,
    viewerRelation: relations.get(row.id) ?? null,
  }));
}

/**
 * `GET /api/businesses` (§5.2) — the full search contract, as opposed to `searchBusinesses()`
 * above which serves the home grid's three filters.
 *
 * Two filters cannot be expressed as columns and are handled by narrowing the candidate set
 * first: `serviceQ`/`priceMin`/`priceMax` are properties of the `services` join rather than of a
 * business, and `date`/`hourFrom`/`hourTo`/`sort=nextAvailable` are properties of *computed
 * availability*, which has no column at all (§2).
 *
 * The availability pass is the expensive one §12.8 warns about, so it runs **after** paging, over
 * at most `pageSize` businesses, with the 14-day horizon `get_next_available()` enforces
 * internally. Sorting by it necessarily evaluates the whole filtered set, which is why that sort
 * is opt-in rather than the default.
 */
export async function searchBusinessesPaged(query: BusinessSearchQuery): Promise<BusinessSearchResult> {
  const supabase = await createClient();

  const needsServiceJoin =
    query.serviceQ !== undefined || query.priceMin !== undefined || query.priceMax !== undefined;

  let matchingByService: string[] | null = null;

  if (needsServiceJoin) {
    let serviceQuery = supabase.from('services').select('employee_id, name, price').eq('status', 'ACTIVE');

    if (query.serviceQ) serviceQuery = serviceQuery.ilike('name', `%${query.serviceQ}%`);
    if (query.priceMin !== undefined) serviceQuery = serviceQuery.gte('price', query.priceMin);
    if (query.priceMax !== undefined) serviceQuery = serviceQuery.lte('price', query.priceMax);

    const { data: services, error: servicesError } = await serviceQuery;
    if (servicesError) throw servicesError;

    const employeeIds = [...new Set((services ?? []).map((row) => row.employee_id))];
    if (employeeIds.length === 0) {
      return { items: [], page: query.page, pageSize: query.pageSize, total: 0 };
    }

    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('business_id')
      .in('id', employeeIds)
      .eq('status', 'ACTIVE');
    if (employeesError) throw employeesError;

    matchingByService = [...new Set((employees ?? []).map((row) => row.business_id))];
    if (matchingByService.length === 0) {
      return { items: [], page: query.page, pageSize: query.pageSize, total: 0 };
    }
  }

  let businessIdsMatchingStaff: string[] = [];
  if (query.q) {
    const { data: staff, error: staffError } = await supabase
      .from('employee_public_profiles')
      .select('business_id')
      .ilike('full_name', `%${query.q}%`);
    if (staffError) throw staffError;
    businessIdsMatchingStaff = [...new Set((staff ?? []).map((row) => row.business_id).filter(Boolean))] as string[];
  }

  let base = supabase
    .from('businesses')
    .select(
      'id, name, description, category_id, area, address, photo_paths, approval_policy, categories!inner(id, name, slug)',
      { count: 'exact' },
    );

  if (query.q) {
    const clauses = [`name.ilike.%${query.q}%`];
    if (businessIdsMatchingStaff.length > 0) clauses.push(`id.in.(${businessIdsMatchingStaff.join(',')})`);
    base = base.or(clauses.join(','));
  }
  if (query.category) base = base.eq('categories.slug', query.category);
  if (query.area) base = base.ilike('area', `%${query.area}%`);
  if (matchingByService) base = base.in('id', matchingByService);

  const wantsAvailability =
    query.sort === 'nextAvailable' ||
    query.date !== undefined ||
    query.hourFrom !== undefined ||
    query.hourTo !== undefined;

  // Sorting by next-available has to see every match before it can order them; relevance sorting
  // can page in the database and evaluate availability for one page only.
  const from = (query.page - 1) * query.pageSize;
  const paged = wantsAvailability ? base.order('name') : base.order('name').range(from, from + query.pageSize - 1);

  const { data, error, count } = await paged;
  if (error) throw error;

  const rows = data ?? [];
  const [staffByBusiness, priceRanges, relations] = await Promise.all([
    loadStaffAvatars(rows.map((row) => row.id)),
    loadPriceRanges(rows.map((row) => row.id)),
    loadViewerBusinessRelations(supabase, rows.map((row) => row.id)),
  ]);

  const availabilityWindow = query.date
    ? {
        from: new Date(`${query.date}T00:00:00Z`),
        to: new Date(new Date(`${query.date}T00:00:00Z`).getTime() + 86_400_000),
      }
    : undefined;

  let items: BusinessSearchResultItem[] = await Promise.all(
    rows.map(async (row) => {
      const category = row.categories as { id: string; name: string; slug: string };
      const staff = staffByBusiness.get(row.id) ?? [];

      return {
        id: row.id,
        name: row.name,
        categoryId: row.category_id,
        area: row.area,
        address: row.address,
        description: row.description ?? '',
        photoUrl: resolvePhotoUrl(supabase, row.photo_paths),
        employeeCount: staff.length,
        employeeAvatarUrls: staff.flatMap((s) => (s.avatarUrl ? [s.avatarUrl] : [])),
        employeeNames: staff.map((s) => s.fullName).filter(Boolean),
        approvalPolicy: row.approval_policy,
        viewerRelation: relations.get(row.id) ?? null,
        category: { id: category.id, slug: category.slug, name: category.name },
        priceRange: priceRanges.get(row.id) ?? null,
        nextAvailableAt: wantsAvailability
          ? await getNextAvailable(row.id, {
              serviceQuery: query.serviceQ,
              hourFrom: query.hourFrom,
              hourTo: query.hourTo,
              ...availabilityWindow,
            })
          : null,
      };
    }),
  );

  let total = count ?? items.length;

  if (wantsAvailability) {
    // A `date`/`hour` filter means "show me places that can actually see me then" — a business
    // with no slot in that window is not a weaker match, it is not a match.
    items = items.filter((item) => item.nextAvailableAt !== null);

    if (query.sort === 'nextAvailable') {
      items.sort((a, b) => (a.nextAvailableAt ?? '').localeCompare(b.nextAvailableAt ?? ''));
    }

    total = items.length;
    items = items.slice(from, from + query.pageSize);
  }

  return { items, page: query.page, pageSize: query.pageSize, total };
}

/** Min/max ACTIVE service price per business, for §5.2's `priceRange`. */
async function loadPriceRanges(
  businessIds: string[],
): Promise<Map<string, { min: number; max: number } | null>> {
  const ranges = new Map<string, { min: number; max: number } | null>();
  if (businessIds.length === 0) return ranges;

  const supabase = await createClient();

  const { data: employees, error: employeesError } = await supabase
    .from('employees')
    .select('id, business_id')
    .in('business_id', businessIds)
    .eq('status', 'ACTIVE');
  if (employeesError) throw employeesError;

  const businessByEmployee = new Map((employees ?? []).map((row) => [row.id, row.business_id]));
  if (businessByEmployee.size === 0) return ranges;

  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('employee_id, price')
    .in('employee_id', [...businessByEmployee.keys()])
    .eq('status', 'ACTIVE');
  if (servicesError) throw servicesError;

  for (const service of services ?? []) {
    const businessId = businessByEmployee.get(service.employee_id);
    if (!businessId) continue;

    const price = Number(service.price);
    const current = ranges.get(businessId);
    ranges.set(
      businessId,
      current ? { min: Math.min(current.min, price), max: Math.max(current.max, price) } : { min: price, max: price },
    );
  }

  return ranges;
}

/**
 * Whether the current request carries a signed-in session — booking is the one thing the public
 * business/employee/service pages refuse to a signed-out visitor (browsing stays anonymous-safe).
 */
export async function isCurrentUserSignedIn(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
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

  const [staffByBusiness, relations] = await Promise.all([
    loadStaffAvatars([businessId]),
    loadViewerBusinessRelations(supabase, [businessId]),
  ]);
  const staff = staffByBusiness.get(businessId) ?? [];

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
    employeeNames: staff.map((s) => s.fullName).filter(Boolean),
    approvalPolicy: data.approval_policy,
    phone: data.phone,
    timezone: data.timezone,
    cancellationWindowHours: data.cancellation_window_hours,
    ownerProfileId: data.owner_profile_id,
    viewerRelation: relations.get(businessId) ?? null,
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
