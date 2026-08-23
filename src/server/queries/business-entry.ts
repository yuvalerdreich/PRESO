import { createClient } from '@/lib/supabase/server';
import { resolvePhotoUrl } from '@/server/queries/shared';
import type { BusinessArea, BusinessCategory, JoinableBusiness, MyBusiness } from '@/types/domain';

/**
 * Onboarding and join-a-business reads (TECHNICAL_DESIGN.md §10.2, §10.3). Replaces
 * `lib/business-entry/*`, which was a placeholder returning empty arrays.
 */

export async function listCategories(): Promise<BusinessCategory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('categories').select('id, name, slug').order('name');
  if (error) throw error;

  return (data ?? []).map((row) => ({ id: row.id, slug: row.slug, name: row.name }));
}

/**
 * §12.20 — `businesses.area` is free text with trigram matching, not a curated `areas` table, so
 * the options offered are simply the areas already in use. That means a genuinely new area is
 * typed rather than picked, which is the intended trade-off: a controlled list would need a table
 * the architecture does not have.
 */
export async function listAreas(): Promise<BusinessArea[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('businesses').select('area').order('area');
  if (error) throw error;

  const unique = [...new Set((data ?? []).map((row) => row.area).filter(Boolean))];
  return unique.map((area) => ({ id: area, name: area }));
}

/**
 * The businesses a signed-in business user can ask to join (§10.3).
 *
 * `pendingRequestStatus` is the caller's own request where one exists, so the list can render
 * "Requested" instead of offering a second request that `join_requests_one_open` would reject
 * with a `23505` (mapped to §8.2's 409). Surfacing state beats explaining an error.
 */
export async function listJoinableBusinesses(): Promise<JoinableBusiness[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: businesses, error }, { data: requests }, { data: employments }] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, name, area, categories(name), employees(count)')
      .eq('status', 'ACTIVE')
      .order('name'),
    user
      ? supabase.from('join_requests').select('business_id, status').eq('profile_id', user.id)
      : Promise.resolve({ data: [] as { business_id: string; status: JoinableBusiness['pendingRequestStatus'] }[] }),
    user
      ? supabase.from('employees').select('business_id').eq('profile_id', user.id)
      : Promise.resolve({ data: [] as { business_id: string }[] }),
  ]);
  if (error) throw error;

  const requestByBusiness = new Map((requests ?? []).map((row) => [row.business_id, row.status]));
  // Somewhere the caller already works is not "joinable" — §3.6's unique (business_id, profile_id)
  // would reject the resulting employees row anyway.
  const alreadyEmployed = new Set((employments ?? []).map((row) => row.business_id));

  return (businesses ?? [])
    .filter((row) => !alreadyEmployed.has(row.id))
    .map((row) => ({
      id: row.id,
      name: row.name,
      area: row.area,
      categoryName: (row.categories as { name: string } | null)?.name ?? '',
      employeeCount: (row.employees as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
      pendingRequestStatus: requestByBusiness.get(row.id) ?? null,
    }));
}

type MyBusinessRow = {
  id: string;
  position_title: string;
  status: MyBusiness['employeeStatus'];
  businesses: {
    id: string;
    name: string;
    area: string;
    address: string;
    photo_paths: string[] | null;
    owner_profile_id: string;
    categories: { name: string } | null;
    employees: { count: number }[] | null;
  } | null;
};

type MyPendingRequestRow = {
  id: string;
  businesses: {
    id: string;
    name: string;
    area: string;
    address: string;
    photo_paths: string[] | null;
    categories: { name: string } | null;
    employees: { count: number }[] | null;
  } | null;
};

/**
 * Every business the caller is attached to — owned, worked at, or applied to (`/businesses`).
 *
 * Two reads rather than one, because the two states live in different tables and there is no row
 * that spans them: an approved employee has an `employees` row and no open `join_request`, while a
 * pending applicant has the reverse (§6.8 rule 5 — approval is what creates the employee row).
 * Only `PENDING` requests are read; an `APPROVED` one has already become an `employees` row and
 * would otherwise list the same business twice, and a `REJECTED` one is not an attachment.
 *
 * `employees(count)` on the embedded business is the roster size, not a filter — PostgREST's
 * aggregate embed. The outer `.eq('profile_id', …)` narrows which `employees` rows come back;
 * `businesses.employees(count)` is a separate embed and counts the whole roster.
 */
export async function listMyBusinesses(): Promise<MyBusiness[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const businessSelect = 'id, name, area, address, photo_paths, categories(name), employees(count)';

  const [{ data: employments, error: employmentsError }, { data: requests, error: requestsError }] =
    await Promise.all([
      supabase
        .from('employees')
        .select(`id, position_title, status, businesses(${businessSelect}, owner_profile_id)`)
        .eq('profile_id', user.id)
        .order('created_at'),
      supabase
        .from('join_requests')
        .select(`id, businesses(${businessSelect})`)
        .eq('profile_id', user.id)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false }),
    ]);
  if (employmentsError) throw employmentsError;
  if (requestsError) throw requestsError;

  const employmentRows = (employments ?? []) as unknown as MyBusinessRow[];
  const ownedBusinessIds = employmentRows.flatMap((row) =>
    row.businesses?.owner_profile_id === user.id ? [row.businesses.id] : [],
  );
  const { data: incomingRequests, error: incomingRequestsError } =
    ownedBusinessIds.length > 0
      ? await supabase
          .from('join_requests')
          .select('business_id')
          .eq('status', 'PENDING')
          .in('business_id', ownedBusinessIds)
      : { data: [], error: null };
  if (incomingRequestsError) throw incomingRequestsError;

  const incomingRequestCounts = new Map<string, number>();
  for (const request of incomingRequests ?? []) {
    incomingRequestCounts.set(request.business_id, (incomingRequestCounts.get(request.business_id) ?? 0) + 1);
  }

  const employed = employmentRows.flatMap((row) => {
    const business = row.businesses;
    if (!business) return [];

    return [
      {
        key: row.id,
        businessId: business.id,
        name: business.name,
        area: business.area,
        address: business.address,
        categoryName: business.categories?.name ?? '',
        photoUrl: resolvePhotoUrl(supabase, business.photo_paths),
        employeeCount: business.employees?.[0]?.count ?? 0,
        relation: business.owner_profile_id === user.id ? ('OWNER' as const) : ('STAFF' as const),
        pendingJoinRequestCount: business.owner_profile_id === user.id ? (incomingRequestCounts.get(business.id) ?? 0) : 0,
        positionTitle: row.position_title,
        employeeStatus: row.status,
      },
    ];
  });

  const pending = ((requests ?? []) as unknown as MyPendingRequestRow[]).flatMap((row) => {
    const business = row.businesses;
    if (!business) return [];

    return [
      {
        key: row.id,
        businessId: business.id,
        name: business.name,
        area: business.area,
        address: business.address,
        categoryName: business.categories?.name ?? '',
        photoUrl: resolvePhotoUrl(supabase, business.photo_paths),
        employeeCount: business.employees?.[0]?.count ?? 0,
        relation: 'PENDING' as const,
        pendingJoinRequestCount: 0,
        positionTitle: null,
        employeeStatus: null,
      },
    ];
  });

  return [...employed, ...pending];
}

/** The caller's own outgoing requests, for `/join`'s "pending" state after submitting. */
export async function listMyJoinRequests(): Promise<{ businessId: string; businessName: string; status: string }[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('join_requests')
    .select('business_id, status, businesses(name)')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    businessId: row.business_id,
    businessName: (row.businesses as { name: string } | null)?.name ?? '',
    status: row.status,
  }));
}
