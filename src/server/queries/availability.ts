import { AppError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';
import { DEFAULT_TIME_ZONE, endOfLocalDay, monthBounds, startOfLocalDay, toDateISO, toTimeHHmm } from '@/lib/time';
import type { Slot, SlotList } from '@/types/domain';

/**
 * The availability engine's caller (TECHNICAL_DESIGN.md §5.3, §6.1).
 *
 * Nothing here computes availability. `get_available_slots()` does, and this module shapes its
 * output — §5.3's "thin caller" rule, and §2's invariant that availability is derived on demand
 * and never stored. The one thing that would be tempting and wrong is caching a day's slots:
 * correctness of a booking never depends on this being fresh, because `book_appointment()`
 * re-checks the slot inside the same transaction as the insert and the exclusion constraint
 * decides the race (§6.2). Freshness here is a UX concern only.
 *
 * This replaces `discoveryRepository.getMonthAvailability`/`getDaySlots`, which returned the same
 * fixed 19 times for every employee and service and treated Saturday as the only closed day
 * (§12.25). Slot times now vary with the selected service's `duration + buffer` (§12.6) and with
 * each employee's own working windows, because they are the actual output of §6.1.
 */

/** Resolve the timezone every returned instant should be rendered in (§12.3). */
async function timeZoneForEmployee(employeeId: string): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('employees')
    .select('businesses(timezone)')
    .eq('id', employeeId)
    .maybeSingle();
  if (error) throw error;

  return (data?.businesses as { timezone: string } | null)?.timezone ?? DEFAULT_TIME_ZONE;
}

export async function getAvailableSlots(
  employeeId: string,
  serviceId: string,
  from: Date,
  to: Date,
): Promise<SlotList> {
  const supabase = await createClient();
  const timezone = await timeZoneForEmployee(employeeId);

  const { data, error } = await supabase.rpc('get_available_slots', {
    p_employee_id: employeeId,
    p_service_id: serviceId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) throw error;

  const slots: Slot[] = (data ?? []).map((row) => {
    const startsAt = new Date(row.starts_at);
    return {
      startsAt: startsAt.toISOString(),
      endsAt: new Date(row.ends_at).toISOString(),
      // Resolved server-side so no component needs date-fns-tz or has to know the business zone.
      dateISO: toDateISO(startsAt, timezone),
      time: toTimeHHmm(startsAt, timezone),
    };
  });

  return { employeeId, serviceId, timezone, slots };
}

/**
 * §5.3's `422` guard.
 *
 * `get_available_slots()` returns zero rows for *both* "closed that day" and "this pair can never
 * be booked" — its guard clause `return`s an empty set rather than raising (0006_fn_availability
 * .sql, §6.1 step 2). The UI needs to tell those apart to explain an empty calendar instead of
 * showing a blank month, so the structural conditions are re-checked here in the one place that
 * needs the distinction. Throws `UNPROCESSABLE`; returns silently when the pair is bookable.
 */
export async function assertBookablePair(employeeId: string, serviceId: string): Promise<void> {
  const supabase = await createClient();

  const [{ data: service, error: serviceError }, { data: employee, error: employeeError }] = await Promise.all([
    supabase.from('services').select('id, employee_id, status').eq('id', serviceId).maybeSingle(),
    supabase
      .from('employees')
      .select('id, status, business_id, businesses(status)')
      .eq('id', employeeId)
      .maybeSingle(),
  ]);
  if (serviceError) throw serviceError;
  if (employeeError) throw employeeError;

  if (!employee) throw new AppError('NOT_FOUND', 'That staff member no longer exists.');
  if (!service) throw new AppError('NOT_FOUND', 'That service no longer exists.');

  if (service.employee_id !== employeeId) {
    throw new AppError('UNPROCESSABLE', "That service isn't offered by the selected staff member.");
  }
  if (service.status !== 'ACTIVE') {
    throw new AppError('UNPROCESSABLE', 'That service is not currently offered.');
  }
  if (employee.status !== 'ACTIVE') {
    throw new AppError('UNPROCESSABLE', 'That staff member is not currently taking appointments.');
  }
  if ((employee.businesses as { status: string } | null)?.status !== 'ACTIVE') {
    throw new AppError('UNPROCESSABLE', 'This business is not currently taking appointments.');
  }

  // §12.10 / PDF §8 rule 7 — no WEEKLY_WINDOW means nothing can ever be bookable, which is
  // exactly the "explain why the calendar is empty" case rather than "fully booked".
  const { count, error: ruleError } = await supabase
    .from('employee_availability_rules')
    .select('id', { count: 'exact', head: true })
    .eq('employee_id', employeeId)
    .eq('kind', 'WEEKLY_WINDOW');
  if (ruleError) throw ruleError;

  if ((count ?? 0) === 0) {
    throw new AppError('UNPROCESSABLE', "This staff member hasn't set their working hours yet.");
  }
}

/** ISO dates in `monthISO` (`YYYY-MM`) that have at least one slot — drives the month calendar. */
export async function getMonthAvailability(
  employeeId: string,
  serviceId: string,
  monthISO: string,
): Promise<string[]> {
  const timezone = await timeZoneForEmployee(employeeId);
  const { from, to } = monthBounds(monthISO, timezone);

  // Never ask for slots that are already in the past; the engine discards them anyway.
  const now = new Date();
  const { slots } = await getAvailableSlots(employeeId, serviceId, from > now ? from : now, to);

  return [...new Set(slots.map((slot) => slot.dateISO))].sort();
}

/** "HH:mm" start times for one local date; empty when closed or fully booked. */
export async function getDaySlots(employeeId: string, serviceId: string, dateISO: string): Promise<string[]> {
  const timezone = await timeZoneForEmployee(employeeId);

  const { slots } = await getAvailableSlots(
    employeeId,
    serviceId,
    startOfLocalDay(dateISO, timezone),
    endOfLocalDay(dateISO, timezone),
  );

  return slots.map((slot) => slot.time);
}

/**
 * §5.2's `nextAvailableAt`, via `get_next_available()` (0014_fn_search.sql, §6.6).
 *
 * Evaluated for the current result page only, with the 14-day horizon the function enforces
 * internally — §12.8 flags this as the one endpoint whose cost the schema doesn't bound.
 */
export async function getNextAvailable(
  businessId: string,
  options: { serviceQuery?: string; hourFrom?: string; hourTo?: string; from?: Date; to?: Date } = {},
): Promise<string | null> {
  const supabase = await createClient();

  const from = options.from ?? new Date();
  const to = options.to ?? new Date(from.getTime() + 14 * 86_400_000);

  const { data, error } = await supabase.rpc('get_next_available', {
    p_business_id: businessId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    ...(options.serviceQuery ? { p_service_query: options.serviceQuery } : {}),
    ...(options.hourFrom ? { p_hour_from: options.hourFrom } : {}),
    ...(options.hourTo ? { p_hour_to: options.hourTo } : {}),
  });
  if (error) throw error;

  return data ?? null;
}
