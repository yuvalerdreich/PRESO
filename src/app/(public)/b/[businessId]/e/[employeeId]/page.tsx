import { notFound } from 'next/navigation';

import { BusinessProfile } from '@/components/public/business-profile';
import {
  getBusinessEmployee,
  getBusinessProfile,
  listBusinessEmployees,
  listCategories,
  listEmployeeServices,
} from '@/server/queries/discovery';

export default async function EmployeePage({ params }: PageProps<'/b/[businessId]/e/[employeeId]'>) {
  const { businessId, employeeId } = await params;

  const [business, categories, employees, selectedEmployee, services] = await Promise.all([
    getBusinessProfile(businessId),
    listCategories(),
    listBusinessEmployees(businessId),
    getBusinessEmployee(businessId, employeeId),
    listEmployeeServices(businessId, employeeId),
  ]);

  // `getBusinessEmployee` is scoped to the business, so a URL pairing one business with another's
  // employee 404s here rather than rendering the wrong roster.
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
