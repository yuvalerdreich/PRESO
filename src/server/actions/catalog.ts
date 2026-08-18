'use server';

import { revalidatePath } from 'next/cache';

import { AppError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { deleteServiceInput, serviceInput } from '@/lib/validation/service';
import { action } from '@/server/action';
import { getCurrentEmployment } from '@/server/queries/dashboard';

/**
 * Catalog module — services (TECHNICAL_DESIGN.md §5.5, §4.3).
 *
 * Services belong to an **employee**, not a business (§3.8), so these act on the *acting*
 * employee's own catalogue. The owning employee is resolved from the session rather than accepted
 * as a parameter, which is what makes "another employee's service is unreachable" true by
 * construction rather than by validation — and RLS re-checks it regardless.
 */

export const upsertService = action('upsertService', serviceInput, async (input) => {
  const employment = await getCurrentEmployment();
  if (!employment) throw new AppError('FORBIDDEN', 'You need an active staff position to manage services.');

  const supabase = await createClient();

  const row = {
    employee_id: employment.employeeId,
    name: input.name,
    price: input.price,
    duration_minutes: input.durationMinutes,
    buffer_minutes: input.bufferMinutes,
    status: input.status,
  };

  // `.eq('employee_id', …)` on the update is belt-and-braces over RLS: without it a forged `id`
  // would still be rejected by the services policy, but the query would report "0 rows updated"
  // rather than making the intent obvious in the code.
  const { data, error } = input.id
    ? await supabase
        .from('services')
        .update(row)
        .eq('id', input.id)
        .eq('employee_id', employment.employeeId)
        .select('id')
        .maybeSingle()
    : await supabase.from('services').insert(row).select('id').single();
  if (error) throw error;
  if (!data) throw new AppError('NOT_FOUND', 'That service no longer exists.');

  revalidatePath('/dashboard/services');
  revalidatePath(`/b/${employment.businessId}`);

  return { id: data.id };
});

/**
 * §4.3 — soft-delete to `INACTIVE` when the service is referenced by an appointment, hard-delete
 * otherwise, so history survives (§6.9: the FK is `on delete restrict`).
 *
 * Implemented as "try the hard delete, fall back on `23503`" rather than "count appointments,
 * then choose". The constraint is the authority either way, and asking first is a race — a
 * booking placed between the count and the delete would make the count's answer wrong.
 */
export const deleteService = action('deleteService', deleteServiceInput, async (input) => {
  const employment = await getCurrentEmployment();
  if (!employment) throw new AppError('FORBIDDEN', 'You need an active staff position to manage services.');

  const supabase = await createClient();

  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', input.id)
    .eq('employee_id', employment.employeeId);

  let softDeleted = false;

  if (error) {
    if (error.code !== '23503') throw error;

    const { error: updateError } = await supabase
      .from('services')
      .update({ status: 'INACTIVE' })
      .eq('id', input.id)
      .eq('employee_id', employment.employeeId);
    if (updateError) throw updateError;

    softDeleted = true;
  }

  revalidatePath('/dashboard/services');
  revalidatePath(`/b/${employment.businessId}`);

  return { id: input.id, softDeleted };
});
