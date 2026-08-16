import { createClient } from '@/lib/supabase/server';
import type { BusinessArea, BusinessCategory, JoinableBusiness } from '@/types/domain';

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
