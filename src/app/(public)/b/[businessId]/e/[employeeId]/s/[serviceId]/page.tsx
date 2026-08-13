import { notFound } from 'next/navigation';

import { BusinessProfile } from '@/components/public/business-profile';
import { discoveryRepository } from '@/lib/discovery/repository';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function currentMonthISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

function firstOpenDateOfMonth(monthISO: string): string {
  const [year, month] = monthISO.split('-').map(Number);
  let date = new Date(year, month - 1, 1);
  while (date.getDay() === 6) date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return toISODate(date);
}

function defaultDateForMonth(monthISO: string): string {
  if (monthISO !== currentMonthISO()) return firstOpenDateOfMonth(monthISO);

  let date = new Date();
  while (date.getDay() === 6) date = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  return toISODate(date);
}

export default async function ServiceAvailabilityPage({
  params,
  searchParams,
}: PageProps<'/b/[businessId]/e/[employeeId]/s/[serviceId]'>) {
  const { businessId, employeeId, serviceId } = await params;
  const search = await searchParams;

  const monthISO = typeof search.month === 'string' ? search.month : currentMonthISO();
  const dateISO = typeof search.date === 'string' ? search.date : defaultDateForMonth(monthISO);
  const selectedSlot = typeof search.slot === 'string' ? search.slot : undefined;

  const [business, categories, employees, selectedEmployee, services, availableDates, daySlots] = await Promise.all([
    discoveryRepository.getBusinessProfile(businessId),
    discoveryRepository.listCategories(),
    discoveryRepository.listBusinessEmployees(businessId),
    discoveryRepository.getBusinessEmployee(businessId, employeeId),
    discoveryRepository.listEmployeeServices(businessId, employeeId),
    discoveryRepository.getMonthAvailability(employeeId, serviceId, monthISO),
    discoveryRepository.getDaySlots(employeeId, serviceId, dateISO),
  ]);

  if (!business || !selectedEmployee) notFound();

  const selectedService = services.find((service) => service.id === serviceId);
  if (!selectedService) notFound();

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
    />
  );
}
