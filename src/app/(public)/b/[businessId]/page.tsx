import { notFound, redirect } from 'next/navigation';

import { listBusinessEmployees } from '@/server/queries/discovery';

export default async function BusinessPage({ params }: PageProps<'/b/[businessId]'>) {
  const { businessId } = await params;
  const employees = await listBusinessEmployees(businessId);
  const [firstEmployee] = employees;

  if (!firstEmployee) notFound();

  redirect(`/b/${businessId}/e/${firstEmployee.id}`);
}
