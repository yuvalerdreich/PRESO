import { notFound } from 'next/navigation';

import { BusinessProfile } from '@/components/public/business-profile';
import { discoveryRepository } from '@/lib/discovery/repository';

type BusinessPageProps = {
  params: Promise<{ businessId: string }>;
};

export default async function BusinessPage({ params }: BusinessPageProps) {
  const { businessId } = await params;
  const [business, employees] = await Promise.all([
    discoveryRepository.getBusinessProfile(businessId),
    discoveryRepository.listBusinessEmployees(businessId),
  ]);

  if (!business) notFound();

  return <BusinessProfile business={business} employees={employees} />;
}
