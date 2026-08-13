import { notFound, redirect } from 'next/navigation';

import { discoveryRepository } from '@/lib/discovery/repository';

export default async function BusinessPage({ params }: PageProps<'/b/[businessId]'>) {
  const { businessId } = await params;
  const employees = await discoveryRepository.listBusinessEmployees(businessId);
  const [firstEmployee] = employees;

  if (!firstEmployee) notFound();

  redirect(`/b/${businessId}/e/${firstEmployee.id}`);
}
