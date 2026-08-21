'use server';

import { revalidatePath } from 'next/cache';

import { AppError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_TIME_ZONE, endOfLocalDay, startOfLocalDay, toTstzRange } from '@/lib/time';
import {
  availabilityRuleInput,
  dayScheduleInput,
  deleteAvailabilityRuleInput,
  setWeeklyAvailabilityInput,
} from '@/lib/validation/availability';
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
    revalidatePath('/businesses/manage/hours');
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

    revalidatePath('/businesses/manage/hours');
    revalidatePath(`/b/${employment.businessId}`);

    return { id: input.id };
  },
);

/**
 * `/businesses/manage/hours` — the employee's own recurring weekly pattern, replace-all across the
 * whole week in one save (§12.67). The same shape `setOperatingHours` uses for `business_hours`, one
 * level down: this replaces every `WEEKLY_WINDOW` row for the acting employee, not the business.
 *
 * Replace-all, not a per-row edit, for the same reason `setOperatingHours` is: the delete and the
 * insert are two statements and therefore not atomic, and the worst intermediate outcome is a
 * moment with no recurring pattern at all — which yields no bookable slots for that gap, not
 * corrupted data. Re-saving fixes it.
 */
export const setWeeklyAvailability = action(
  'setWeeklyAvailability',
  setWeeklyAvailabilityInput,
  async (input) => {
    const employment = await getCurrentEmployment();
    if (!employment) throw new AppError('FORBIDDEN', 'You need an active staff position to set availability.');

    if (input.employeeId !== employment.employeeId) {
      throw new AppError('FORBIDDEN', 'You can only change your own working hours.');
    }

    const supabase = await createClient();

    const { error: deleteError } = await supabase
      .from('employee_availability_rules')
      .delete()
      .eq('employee_id', input.employeeId)
      .eq('kind', 'WEEKLY_WINDOW');
    if (deleteError) throw deleteError;

    if (input.rows.length > 0) {
      const { error: insertError } = await supabase.from('employee_availability_rules').insert(
        input.rows.map((row) => ({
          employee_id: input.employeeId,
          kind: 'WEEKLY_WINDOW' as const,
          day_of_week: row.dayOfWeek,
          starts_at: row.startsAt,
          ends_at: row.endsAt,
          effective_range: null,
        })),
      );
      if (insertError) throw insertError;
    }

    revalidatePath('/businesses/manage/hours');
    revalidatePath(`/b/${employment.businessId}`);

    return { employeeId: input.employeeId, rows: input.rows.length };
  },
);

/**
 * `/businesses/manage/hours` — save one day's shifts as a finished state (§12.50).
 *
 * The screen edits a day, not a row, so this takes the day's shifts and works out the writes. Two
 * scopes, mapping onto §3.7's kinds:
 *
 * - **DATE** — `EXCEPTION` rows covering that one local day, which *replace* the weekly pattern for
 *   it (§6.1 step 5). A day off is a whole-day `BLOCK` instead, because the CHECK requires an
 *   EXCEPTION to carry times: "no windows at all" is not expressible as an exception, and a BLOCK
 *   over the whole day subtracts everything the weekly pattern would otherwise open.
 * - **WEEKLY** — `WEEKLY_WINDOW` rows for that weekday. A day off here is simply no rows.
 *
 * **Write order is insert-then-delete, deliberately.** Two statements cannot share a transaction
 * through PostgREST, so one of them can fail alone. Deleting first and failing to insert would
 * leave the employee with an empty day — silently unbookable. This way the worst case is the old
 * and new windows both standing for a moment: visible, over-permissive rather than under, and
 * fixed by saving again. Nothing here touches appointments (§6.9: adding a day off never
 * auto-cancels; the employee cancels each one so the client is notified).
 */
export const setDaySchedule = action('setDaySchedule', dayScheduleInput, async (input) => {
  const employment = await getCurrentEmployment();
  if (!employment) throw new AppError('FORBIDDEN', 'You need an active staff position to set availability.');

  // Same rule as `upsertAvailabilityRule`: §12.1 lets any employee edit the *business's* opening
  // hours, but working hours belong to the person who works them. RLS re-checks this.
  if (input.employeeId !== employment.employeeId) {
    throw new AppError('FORBIDDEN', 'You can only change your own working hours.');
  }

  const supabase = await createClient();

  const { data: business, error: businessError } = await supabase
    .from('businesses')
    .select('timezone')
    .eq('id', employment.businessId)
    .maybeSingle();
  if (businessError) throw businessError;

  const timezone = business?.timezone ?? DEFAULT_TIME_ZONE;
  const dayRange =
    input.scope === 'DATE' && input.dateISO
      ? toTstzRange(startOfLocalDay(input.dateISO, timezone), endOfLocalDay(input.dateISO, timezone))
      : null;

  // The rows this save replaces, collected before anything is written.
  const existing = supabase
    .from('employee_availability_rules')
    .select('id')
    .eq('employee_id', employment.employeeId);

  const { data: replaced, error: replacedError } =
    input.scope === 'DATE'
      ? // `overlaps` on the day, not `eq` on the range: an exception written by hand may span
        // several days, and rewriting this day's schedule has to supersede it.
        await existing.in('kind', ['EXCEPTION', 'BLOCK']).overlaps('effective_range', dayRange!)
      : await existing.eq('kind', 'WEEKLY_WINDOW').eq('day_of_week', input.dayOfWeek!);
  if (replacedError) throw replacedError;

  // Clearing a day's hours is a normal save, not an error — it just has to arrive as what it is. The
  // schema refuses `shifts: []` unless `isDayOff` says so (a day with no windows offers nothing, so
  // "working" over an empty list is a claim the engine contradicts), which is why nothing needs
  // normalising here.
  const rows: Database['public']['Tables']['employee_availability_rules']['Insert'][] = input.isDayOff
    ? input.scope === 'DATE'
      ? [
          {
            employee_id: employment.employeeId,
            kind: 'BLOCK',
            day_of_week: null,
            starts_at: null,
            ends_at: null,
            effective_range: dayRange,
          },
        ]
      : []
    : input.shifts.map((shift) => ({
        employee_id: employment.employeeId,
        kind: input.scope === 'DATE' ? ('EXCEPTION' as const) : ('WEEKLY_WINDOW' as const),
        day_of_week: input.scope === 'DATE' ? null : input.dayOfWeek!,
        starts_at: shift.startsAt,
        ends_at: shift.endsAt,
        effective_range: input.scope === 'DATE' ? dayRange : null,
      }));

  if (rows.length > 0) {
    const { error } = await supabase.from('employee_availability_rules').insert(rows);
    if (error) throw error;
  }

  const replacedIds = (replaced ?? []).map((row) => row.id);
  if (replacedIds.length > 0) {
    const { error } = await supabase
      .from('employee_availability_rules')
      .delete()
      .in('id', replacedIds)
      .eq('employee_id', employment.employeeId);
    if (error) throw error;
  }

  revalidatePath('/businesses/manage/hours');
  revalidatePath('/businesses/manage/hours');
  revalidatePath(`/b/${employment.businessId}`);

  return { written: rows.length, replaced: replacedIds.length };
});
