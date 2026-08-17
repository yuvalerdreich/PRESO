'use server';

import { revalidatePath } from 'next/cache';

import { AppError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { toTstzRange } from '@/lib/time';
import { availabilityRuleInput, deleteAvailabilityRuleInput } from '@/lib/validation/availability';
import { action } from '@/server/action';
import { getCurrentEmployment } from '@/server/queries/dashboard';
import type { Database } from '@/types/database.types';

/**
 * Availability rules (TECHNICAL_DESIGN.md §5.5, §4.5, §3.7).
 *
 * Like services, rules belong to the employee: `employee_availability_rules` is writable only by
 * the owning employee (`e.profile_id = auth.uid()`), so an employee cannot change a colleague's
 * working hours even though §12.1 lets them change the whole business's opening hours.
 *
 * §6.9 is the rule worth remembering here: adding a VACATION over a booked slot does **not**
 * auto-cancel anything. The rule saves, the appointments stand, and the employee cancels them
 * explicitly so each client is notified. Nothing below deletes an appointment.
 */

/**
 * Column shape per `kind`, matching §3.7's kind-dependent CHECK. The discriminated union in the
 * schema already guarantees the right fields are present; this maps them onto the columns the
 * CHECK expects, nulling the ones that must be absent.
 */
function toRuleColumns(
  input: ReturnType<typeof availabilityRuleInput.parse>,
): Database['public']['Tables']['employee_availability_rules']['Insert'] {
  const base = { employee_id: input.employeeId, kind: input.kind };

  switch (input.kind) {
    case 'WEEKLY_WINDOW':
      return {
        ...base,
        day_of_week: input.dayOfWeek,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        effective_range: null,
      };
    case 'EXCEPTION':
      return {
        ...base,
        day_of_week: null,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        effective_range: toTstzRange(new Date(input.effectiveFrom), new Date(input.effectiveTo)),
      };
    case 'VACATION':
    case 'BLOCK':
      return {
        ...base,
        day_of_week: null,
        starts_at: null,
        ends_at: null,
        effective_range: toTstzRange(new Date(input.effectiveFrom), new Date(input.effectiveTo)),
      };
  }
}

export const upsertAvailabilityRule = action(
  'upsertAvailabilityRule',
  availabilityRuleInput,
  async (input) => {
    const employment = await getCurrentEmployment();
    if (!employment) throw new AppError('FORBIDDEN', 'You need an active staff position to set availability.');

    if (input.employeeId !== employment.employeeId) {
      throw new AppError('FORBIDDEN', "You can only change your own working hours.");
    }

    const supabase = await createClient();
    const row = toRuleColumns(input);

    const { data, error } = input.id
      ? await supabase
          .from('employee_availability_rules')
          .update(row)
          .eq('id', input.id)
          .eq('employee_id', employment.employeeId)
          .select('id')
          .maybeSingle()
      : await supabase.from('employee_availability_rules').insert(row).select('id').single();
    if (error) throw error;
    if (!data) throw new AppError('NOT_FOUND', 'That availability rule no longer exists.');

    // §7.2 — this invalidates every availability key for this employee, not just one date.
    revalidatePath('/dashboard/availability');
    revalidatePath(`/b/${employment.businessId}`);

    return { id: data.id };
  },
);

export const deleteAvailabilityRule = action(
  'deleteAvailabilityRule',
  deleteAvailabilityRuleInput,
  async (input) => {
    const employment = await getCurrentEmployment();
    if (!employment) throw new AppError('FORBIDDEN', 'You need an active staff position to set availability.');

    const supabase = await createClient();
    const { error } = await supabase
      .from('employee_availability_rules')
      .delete()
      .eq('id', input.id)
      .eq('employee_id', employment.employeeId);
    if (error) throw error;

    revalidatePath('/dashboard/availability');
    revalidatePath(`/b/${employment.businessId}`);

    return { id: input.id };
  },
);
