import { createClient } from '@/lib/supabase/server';
import { DEFAULT_TIME_ZONE, parseTstzRange, toDateISO, toTimeHHmm } from '@/lib/time';
import type { ClientAppointment, ClientWaitlistEntry } from '@/types/domain';

/**
 * Client-portal reads (TECHNICAL_DESIGN.md §4.4, §7). Replaces `lib/appointments/*`.
 *
 * **Scoping is RLS's job, not this file's.** `appointments_select` (0010_rls.sql) already limits
 * rows to the client, the assigned employee, the business owner or an admin, so these functions
 * deliberately do not add `.eq('client_profile_id', me)`. Adding it would be harmless today and
 * misleading tomorrow: it would suggest the filter is what provides isolation, when removing it
 * changes nothing about what the database returns.
 *
 * Both list functions return `[]` for an anonymous visitor rather than throwing. The public
 * header renders an appointment count on every public page, including to signed-out visitors, so
 * "no session" is an ordinary state here and not an error.
 */

/**
 * The select shape both readers share. Two things about it are load-bearing:
 *
 * `slot` is a `tstzrange`, which PostgREST has no JSON representation for — it arrives as a raw
 * literal and goes through `parseTstzRange`.
 *
 * The employee's **name** comes from `employee_public_profiles`, not from `employees(profiles(…))`.
 * The obvious join compiles, runs, and silently returns `null` for the name: `profiles_select`
 * scopes that table to own-row-or-admin, so a client reading their own appointment cannot see the
 * profile row of the staff member they booked with. The 0015 view exists precisely to expose the
 * two publicly-safe columns, and PostgREST resolves it through the same
 * `appointments_employee_id_fkey`.
 */
const APPOINTMENT_SELECT = `
  id,
  employee_id,
  service_id,
  slot,
  status,
  services(name),
  employees(businesses(id, name, address, timezone)),
  employee_public_profiles(full_name)
` as const;

type AppointmentRow = {
  id: string;
  employee_id: string;
  service_id: string;
  slot: unknown;
  status: ClientAppointment['status'];
  services: { name: string } | null;
  employees: { businesses: { id: string; name: string; address: string; timezone: string } | null } | null;
  employee_public_profiles: { full_name: string | null } | null;
};

export async function listClientAppointments(): Promise<ClientAppointment[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('client_profile_id', user.id)
    .order('slot', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as AppointmentRow[]).map(toClientAppointment);
}

export async function listClientWaitlistEntries(): Promise<ClientWaitlistEntry[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('waitlist_entries')
    .select(
      `id, from_ts, to_ts, status,
       services(name),
       businesses(name, timezone),
       waitlist_employee_targets(employee_public_profiles(full_name))`,
    )
    .eq('client_profile_id', user.id)
    .neq('status', 'EXPIRED')
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const business = row.businesses as { name: string; timezone: string } | null;
    const timezone = business?.timezone ?? DEFAULT_TIME_ZONE;
    const from = new Date(row.from_ts);
    const to = new Date(row.to_ts);

    // Same reason as APPOINTMENT_SELECT above: names come from the public view, never `profiles`.
    const targets = (row.waitlist_employee_targets ?? []) as unknown as {
      employee_public_profiles: { full_name: string | null } | null;
    }[];

    return {
      id: row.id,
      businessName: business?.name ?? '',
      // No target rows means "any employee in the business" (§3.10), which is a real choice a
      // client makes rather than missing data — so it gets a label rather than an empty string.
      employeeName:
        targets.length > 0
          ? targets.map((t) => t.employee_public_profiles?.full_name ?? '').filter(Boolean).join(', ')
          : 'כל אנשי הצוות',
      // Likewise a null service_id means "any service".
      serviceName: (row.services as { name: string } | null)?.name ?? 'כל השירותים',
      requestedDateISO: toDateISO(from, timezone),
      requestedRange: `${toTimeHHmm(from, timezone)} - ${toTimeHHmm(to, timezone)}`,
      status: row.status,
    };
  });
}

/** One appointment, for the `PATCH /api/appointments/[id]` response and detail views. */
export async function getAppointment(appointmentId: string): Promise<ClientAppointment | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('appointments')
    .select(APPOINTMENT_SELECT)
    .eq('id', appointmentId)
    .maybeSingle();
  if (error) throw error;

  return data ? toClientAppointment(data as unknown as AppointmentRow) : null;
}

function toClientAppointment(row: AppointmentRow): ClientAppointment {
  const business = row.employees?.businesses;
  const timezone = business?.timezone ?? DEFAULT_TIME_ZONE;
  const range = parseTstzRange(row.slot);
  const startsAt = range?.startsAt ?? new Date(0);

  return {
    id: row.id,
    businessId: business?.id ?? '',
    employeeId: row.employee_id,
    serviceId: row.service_id,
    businessName: business?.name ?? '',
    employeeName: row.employee_public_profiles?.full_name ?? '',
    serviceName: row.services?.name ?? '',
    address: business?.address ?? '',
    // Rendered in the *business's* timezone, not the viewer's — an 11:30 appointment is 11:30
    // where the salon is, whatever the client's device thinks.
    dateISO: toDateISO(startsAt, timezone),
    time: toTimeHHmm(startsAt, timezone),
    status: row.status,
  };
}
