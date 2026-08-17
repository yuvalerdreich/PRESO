'use server';

import { revalidatePath } from 'next/cache';

import { AppError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import {
  decideJoinRequestInput,
  employeeStatusInput,
  removeEmployeeInput,
  sendJoinRequestInput,
} from '@/lib/validation/business';
import { action } from '@/server/action';
import { requireOwnerOf, requireSession } from '@/server/guards';

/**
 * Employee module — the roster (TECHNICAL_DESIGN.md §5.5, §4.2).
 *
 * This is where §12.1's line falls. Any ACTIVE employee edits the business (`business.ts`), but
 * **only the founder** decides join requests and manages who is on the roster — so every action
 * here except `sendJoinRequest` goes through `requireOwnerOf`, and each is re-checked inside its
 * RPC or by RLS.
 */

/**
 * §10.3. The duplicate case is left to the database: `join_requests_one_open` (0004_indexes.sql)
 * is a partial unique index, and a second open request raises `23505`, which §8.2 maps to a 409
 * with "You already have a pending request to this business." Checking first would be a race and
 * would still need the constraint underneath.
 */
export const sendJoinRequest = action('sendJoinRequest', sendJoinRequestInput, async (input) => {
  const profile = await requireSession();

  if (profile.account_type !== 'BUSINESS') {
    throw new AppError('FORBIDDEN', 'Switch to a business account before joining a business.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('join_requests')
    .insert({ business_id: input.businessId, profile_id: profile.id })
    .select('id')
    .single();
  if (error) throw error;

  revalidatePath('/join');

  return { id: data.id };
});

/**
 * §4.2, §6.8 rules 5 and 6 — approve inserts `employees` and flips the request in one
 * transaction, via `decide_join_request()` (0017). There is no employee row before this point:
 * approval is what creates staff, rather than activating a pending row.
 */
export const decideJoinRequest = action('decideJoinRequest', decideJoinRequestInput, async (input) => {
  const supabase = await createClient();

  // The owner check lives inside the RPC (it is `security definer` and bypasses RLS), but the
  // business id isn't known here without a read, so the guard is the RPC's job alone. RLS on
  // `join_requests` update is the third layer.
  const { data, error } = await supabase.rpc('decide_join_request', {
    p_request_id: input.id,
    p_decision: input.decision,
    p_position_title: input.positionTitle,
  });
  if (error) throw error;

  revalidatePath('/dashboard/staff');
  revalidatePath('/dashboard/staff/requests');

  return { id: data.id, status: data.status };
});

export const setEmployeeStatus = action('setEmployeeStatus', employeeStatusInput, async (input) => {
  const supabase = await createClient();

  const { data: employee, error: lookupError } = await supabase
    .from('employees')
    .select('business_id')
    .eq('id', input.employeeId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!employee) throw new AppError('NOT_FOUND', 'That staff member no longer exists.');

  await requireOwnerOf(employee.business_id);

  const { error } = await supabase
    .from('employees')
    .update({ status: input.status })
    .eq('id', input.employeeId);
  if (error) throw error;

  revalidatePath('/dashboard/staff');
  revalidatePath(`/b/${employee.business_id}`);

  return { employeeId: input.employeeId, status: input.status };
});

/**
 * §6.9's two refusals — the last employee, and an employee with future appointments — are both
 * raised by `remove_employee()` (0017) rather than checked here. Counting in application code
 * and then deleting is a race: two concurrent removals can each see "2 remaining" and both
 * succeed, emptying the roster. §8.2's table already anticipated this by listing
 * `raise 'last_employee'` as a database error.
 *
 * `retired` distinguishes the two outcomes the RPC can have. An employee who has ever held an
 * appointment cannot be hard-deleted — `appointments.employee_id` is `on delete restrict` so
 * history survives (§6.9) — so their position is set `INACTIVE` instead. The UI should say
 * "removed from the roster" either way, but the flag is there because the two are genuinely
 * different: a retired position still exists and still anchors past bookings.
 */
export const removeEmployee = action('removeEmployee', removeEmployeeInput, async (input) => {
  const supabase = await createClient();

  const { data: employee } = await supabase
    .from('employees')
    .select('business_id')
    .eq('id', input.employeeId)
    .maybeSingle();

  const { data: retired, error } = await supabase.rpc('remove_employee', {
    p_employee_id: input.employeeId,
  });
  if (error) throw error;

  revalidatePath('/dashboard/staff');
  if (employee) revalidatePath(`/b/${employee.business_id}`);

  return { employeeId: input.employeeId, retired: retired ?? false };
});
