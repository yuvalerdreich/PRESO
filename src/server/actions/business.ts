'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import {
  businessDetailsInput,
  createBusinessInput,
  setOperatingHoursInput,
} from '@/lib/validation/business';
import { action } from '@/server/action';
import { requireEmployeeOf, requireSession } from '@/server/guards';

/**
 * Business module (TECHNICAL_DESIGN.md §5.5, §4.1).
 *
 * Every action is wrapped in `action()`, which parses the same Zod schema the form's resolver
 * used and converts any throw into `ActionResult` — §8.3's rule that an action never throws
 * across the boundary, because a thrown action reaches the client as an opaque digest with the
 * field errors stripped.
 *
 * §12.1's decision shows up here as `requireEmployeeOf` rather than `requireOwnerOf`: **any**
 * ACTIVE employee may edit details, hours and policy. Roster and join-request decisions are the
 * founder's alone and live in `employee.ts`.
 */

/**
 * §6.8 rule 3 — the business and its first employee are inserted together or not at all. Done
 * through `create_business_with_owner()` (0017) rather than two inserts from here: PostgREST has
 * no transaction spanning two requests, so a sequential pair can leave a business with zero
 * employees, which is exactly the state the rule forbids.
 */
export const createBusiness = action('createBusiness', createBusinessInput, async (input) => {
  const profile = await requireSession();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('create_business_with_owner', {
    p_name: input.name,
    p_category_id: input.categoryId,
    p_address: input.address,
    p_area: input.area,
    p_phone: input.phone,
    p_description: input.description || undefined,
    p_timezone: input.timezone,
    p_approval_policy: input.approvalPolicy,
    p_cancellation_window_hours: input.cancellationWindowHours,
    p_position_title: input.positionTitle,
  });
  if (error) throw error;

  // The wizard's opening service list, attached to the `employees` row the RPC just created.
  // Deliberately *outside* that transaction: a service is not part of §6.8 rule 3's invariant
  // ("a business always has ≥1 employee"), so a failure here must not undo the business. The
  // owner lands on a real business with an empty catalogue and adds services from the dashboard,
  // which is the same state an owner who submitted no services reaches.
  let servicesCreated = 0;
  if (input.services.length > 0) {
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('business_id', data.id)
      .eq('profile_id', profile.id)
      .single();
    if (employeeError) throw employeeError;

    const { error: servicesError } = await supabase.from('services').insert(
      input.services.map((service) => ({
        employee_id: employee.id,
        name: service.name,
        price: service.price,
        duration_minutes: service.durationMinutes,
        buffer_minutes: service.bufferMinutes,
        status: service.status,
      })),
    );
    if (servicesError) throw servicesError;

    servicesCreated = input.services.length;
  }

  revalidatePath('/dashboard');
  revalidatePath('/businesses');
  revalidatePath('/');

  return { businessId: data.id, servicesCreated };
});

export const updateBusinessDetails = action('updateBusinessDetails', businessDetailsInput, async (input) => {
  await requireEmployeeOf(input.businessId);
  const supabase = await createClient();

  const { error } = await supabase
    .from('businesses')
    .update({
      name: input.name,
      description: input.description || null,
      category_id: input.categoryId,
      address: input.address,
      area: input.area,
      phone: input.phone,
      timezone: input.timezone,
      approval_policy: input.approvalPolicy,
      cancellation_window_hours: input.cancellationWindowHours,
    })
    .eq('id', input.businessId);
  if (error) throw error;

  revalidatePath('/dashboard/details');
  revalidatePath(`/b/${input.businessId}`);

  return { businessId: input.businessId };
});

/**
 * Replace-all, not a per-row edit (§4.5). The delete and the insert are two statements and
 * therefore not atomic, which is a deliberate trade rather than an oversight: the worst outcome
 * is a business with no hours for a moment, which yields no bookable slots — availability is
 * derived, so nothing is corrupted and re-saving fixes it. Compare `createBusiness` above, where
 * the intermediate state would violate a stated rule and so had to become an RPC.
 *
 * §7.2: this invalidates availability for **every** employee of the business, since business
 * hours are the outer boundary every window is intersected against (§6.1 step 6).
 */
export const setOperatingHours = action('setOperatingHours', setOperatingHoursInput, async (input) => {
  await requireEmployeeOf(input.businessId);
  const supabase = await createClient();

  const { error: deleteError } = await supabase
    .from('business_hours')
    .delete()
    .eq('business_id', input.businessId);
  if (deleteError) throw deleteError;

  if (input.rows.length > 0) {
    const { error: insertError } = await supabase.from('business_hours').insert(
      input.rows.map((row) => ({
        business_id: input.businessId,
        day_of_week: row.dayOfWeek,
        opens_at: row.opensAt,
        closes_at: row.closesAt,
      })),
    );
    if (insertError) throw insertError;
  }

  revalidatePath('/dashboard/hours');
  revalidatePath(`/b/${input.businessId}`);

  return { businessId: input.businessId, rows: input.rows.length };
});
