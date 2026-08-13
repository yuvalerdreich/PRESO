import { notFound } from 'next/navigation';

import { BusinessProfile } from '@/components/public/business-profile';
import { discoveryRepository } from '@/lib/discovery/repository';

export default async function EmployeePage({ params }: PageProps<'/b/[businessId]/e/[employeeId]'>) {
  const { businessId, employeeId } = await params;

  const [business, categories, employees, selectedEmployee, services] = await Promise.all([
    discoveryRepository.getBusinessProfile(businessId),
    discoveryRepository.listCategories(),
    discoveryRepository.listBusinessEmployees(businessId),
    discoveryRepository.getBusinessEmployee(businessId, employeeId),
    discoveryRepository.listEmployeeServices(businessId, employeeId),
  ]);

  if (!business || !selectedEmployee) notFound();

  const category = categories.find((c) => c.id === business.categoryId);

  return (
    <BusinessProfile
      business={business}
      category={category}
      employees={employees}
      selectedEmployee={selectedEmployee}
      services={services}
    />
  );
}
