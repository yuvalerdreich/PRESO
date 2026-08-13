import { notFound } from 'next/navigation';

import { EmployeeProfile } from '@/components/public/employee-profile';
import { discoveryRepository } from '@/lib/discovery/repository';

type EmployeePageProps = {
  params: Promise<{ businessId: string; employeeId: string }>;
};

export default async function EmployeePage({ params }: EmployeePageProps) {
  const { businessId, employeeId } = await params;
  const [business, employee] = await Promise.all([
    discoveryRepository.getBusinessProfile(businessId),
    discoveryRepository.getBusinessEmployee(businessId, employeeId),
  ]);

  if (!business || !employee) notFound();

  const services = await discoveryRepository.listEmployeeServices(businessId, employeeId);

  return <EmployeeProfile business={business} employee={employee} services={services} />;
}
