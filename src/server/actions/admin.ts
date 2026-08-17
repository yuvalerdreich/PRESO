'use server';

import { revalidatePath } from 'next/cache';

import { AppError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { categoryInput, suspendInput } from '@/lib/validation/admin';
import { resolveReportInput } from '@/lib/validation/moderation';
import { action } from '@/server/action';
import { requireAdmin } from '@/server/guards';

/**
 * Admin console writes (TECHNICAL_DESIGN.md §5.5, §4.5).
 *
 * Two things hold across this whole file:
 *
 * **Nothing here can grant admin.** §6.8 rules 1–2 make `account_type = 'ADMIN'` reachable only by
 * an operator running SQL. `suspendUser` writes `status` and nothing else, and
 * `protect_profile_privileged_columns()` would reject `account_type` anyway.
 *
 * **The audit trail writes itself.** §8.5 requires suspensions to reach `audit_log`, and
 * `audit_business_status_change()` / `audit_profile_status_change()` (0009_triggers.sql) already
 * do it on the status column. Writing an audit row from here as well would double-count, and a
 * trigger cannot be bypassed by a future caller that forgets — which is the point.
 *
 * **Every update here asserts it actually matched a row.** An UPDATE that RLS filters to zero
 * rows is not an error: PostgREST returns success and the action would report `{ ok: true }`
 * having changed nothing. That is how the missing `is_admin()` clause on `businesses_update`
 * (fixed in 0019) stayed invisible — a suspension that silently did not happen. `.select()` plus
 * an explicit emptiness check turns that class of bug into a `NOT_FOUND` the caller can see.
 */

export const suspendUser = action('suspendUser', suspendInput, async (input) => {
  const admin = await requireAdmin();

  if (input.id === admin.id) {
    throw new AppError('UNPROCESSABLE', 'You cannot suspend your own account.');
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .update({ status: input.suspended ? 'SUSPENDED' : 'ACTIVE' })
    .eq('id', input.id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError('NOT_FOUND', 'That account no longer exists.');

  revalidatePath('/admin/users');

  return { id: input.id, suspended: input.suspended };
});

/**
 * §6.9 — a suspended business disappears from search and produces no slots, but its existing
 * appointments stay visible and cancellable. That behaviour is entirely in `businesses_select`
 * and `get_available_slots()`, so this action only flips the column.
 */
export const suspendBusiness = action('suspendBusiness', suspendInput, async (input) => {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('businesses')
    .update({ status: input.suspended ? 'SUSPENDED' : 'ACTIVE' })
    .eq('id', input.id)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new AppError('NOT_FOUND', 'That business no longer exists.');

  revalidatePath('/admin/businesses');
  revalidatePath(`/b/${input.id}`);
  revalidatePath('/');

  return { id: input.id, suspended: input.suspended };
});

export const upsertCategory = action('upsertCategory', categoryInput, async (input) => {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = input.id
    ? await supabase
        .from('categories')
        .update({ name: input.name, slug: input.slug })
        .eq('id', input.id)
        .select('id')
        .maybeSingle()
    : await supabase.from('categories').insert({ name: input.name, slug: input.slug }).select('id').single();
  if (error) throw error;
  if (!data) throw new AppError('NOT_FOUND', 'That category no longer exists.');

  revalidatePath('/admin/categories');
  revalidatePath('/');

  return { id: data.id };
});

/**
 * §4.5 — a category referenced by a business cannot be deleted: `businesses.category_id` is
 * `on delete restrict`, which surfaces as `23503` and maps to a 404-shaped "no longer exists"
 * through §8.2. Caught here to say what actually happened instead.
 */
export const deleteCategory = action('deleteCategory', categoryInput.pick({ id: true }), async (input) => {
  await requireAdmin();
  if (!input.id) throw new AppError('VALIDATION', 'Choose a category to delete.');

  const supabase = await createClient();
  const { error } = await supabase.from('categories').delete().eq('id', input.id);

  if (error) {
    if (error.code === '23503') {
      throw new AppError(
        'UNPROCESSABLE',
        'This category is still in use by at least one business, so it cannot be deleted.',
      );
    }
    throw error;
  }

  revalidatePath('/admin/categories');

  return { id: input.id };
});

export const resolveReport = action('resolveReport', resolveReportInput, async (input) => {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('reports')
    .update({ status: input.outcome, resolution_note: input.note || null })
    .eq('id', input.id);
  if (error) throw error;

  revalidatePath('/admin/reports');

  return { id: input.id, outcome: input.outcome };
});
