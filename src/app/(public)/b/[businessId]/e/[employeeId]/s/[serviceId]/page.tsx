import { notFound, redirect } from 'next/navigation';

import { BusinessProfile } from '@/components/public/business-profile';
import { getDaySlots, getMonthAvailability } from '@/server/queries/availability';
import { getAppointment } from '@/server/queries/appointments';
import {
  getBusinessEmployee,
  getBusinessProfile,
  isCurrentUserSignedIn,
  listBusinessEmployees,
  listCategories,
  listEmployeeServices,
} from '@/server/queries/discovery';

function currentMonthISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Which date the calendar opens on.
 *
 * This used to guess — step forward until the day was not a Saturday — because the availability
 * mock's only rule was "Saturdays are closed" (§12.25). With the real engine the answer is simply
 * the first date that has slots: it already accounts for business hours, each employee's own
 * windows, vacations, blocks and existing bookings, none of which a weekday check can see. A
 * month with no availability at all now correctly opens on nothing rather than on an arbitrary
 * Sunday that turns out to be empty.
 */
function defaultDate(availableDates: string[], monthISO: string): string {
  const todayISO = new Date().toISOString().slice(0, 10);
  if (availableDates.includes(todayISO)) return todayISO;

  return availableDates[0] ?? `${monthISO}-01`;
}

export default async function ServiceAvailabilityPage({
  params,
  searchParams,
}: PageProps<'/b/[businessId]/e/[employeeId]/s/[serviceId]'>) {
  const { businessId, employeeId, serviceId } = await params;
  const search = await searchParams;

  const monthISO = typeof search.month === 'string' ? search.month : currentMonthISO();
  const selectedSlot = typeof search.slot === 'string' ? search.slot : undefined;
  const waitlistOpen = search.waitlist === '1';
  const rescheduleAppointmentId = typeof search.reschedule === 'string' ? search.reschedule : undefined;

  const [
    isAuthenticated,
    business,
    categories,
    employees,
    selectedEmployee,
    services,
    availableDates,
    rescheduleAppointment,
  ] = await Promise.all([
    isCurrentUserSignedIn(),
    getBusinessProfile(businessId),
    listCategories(),
    listBusinessEmployees(businessId),
    getBusinessEmployee(businessId, employeeId),
    listEmployeeServices(businessId, employeeId),
    getMonthAvailability(employeeId, serviceId, monthISO),
    rescheduleAppointmentId ? getAppointment(rescheduleAppointmentId) : Promise.resolve(null),
  ]);

  if (!business || !selectedEmployee) notFound();

  // The calendar/booking flow requires a session — a signed-out visitor who reaches this URL
  // directly (typed, bookmarked, shared) bounces back to the employee page, which pops the same
  // "sign in to book" dialog a click on "בחר טיפול ופתח יומן" would have shown in place.
  if (!isAuthenticated) redirect(`/b/${businessId}/e/${employeeId}?authRequired=1`);

  // §12.55 — same refusal as the employee page above; this URL is reachable directly too.
  if (business.viewerRelation) redirect(`/?blocked=${businessId}`);

  // Looked up in *this employee's* list, so a service belonging to a colleague 404s rather than
  // rendering a calendar for a pair the engine will never return slots for (PDF §8 rule 8).
  const selectedService = services.find((service) => service.id === serviceId);
  if (!selectedService) notFound();

  // The reschedule RPC keeps the employee and service by design. Reject a hand-edited URL that
  // tries to pair an old appointment with another employee/service's availability calendar.
  if (
    rescheduleAppointmentId &&
    (!rescheduleAppointment ||
      rescheduleAppointment.businessId !== businessId ||
      rescheduleAppointment.employeeId !== employeeId ||
      rescheduleAppointment.serviceId !== serviceId)
  ) {
    notFound();
  }

  const dateISO = typeof search.date === 'string' ? search.date : defaultDate(availableDates, monthISO);
  const daySlots = await getDaySlots(employeeId, serviceId, dateISO);

  const category = categories.find((c) => c.id === business.categoryId);

  return (
    <BusinessProfile
      business={business}
      category={category}
      employees={employees}
      selectedEmployee={selectedEmployee}
      services={services}
      selectedServiceId={selectedService.id}
      calendar={{ monthISO, selectedDate: dateISO, availableDates }}
      slots={{ dateISO, selectedSlot, times: daySlots }}
      waitlistOpen={waitlistOpen}
      rescheduleAppointmentId={rescheduleAppointmentId}
    />
  );
}
