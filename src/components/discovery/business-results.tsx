'use client';

import { EmptyState } from '@/components/common/empty-state';
import { BusinessCard } from '@/components/discovery/business-card';
import type { DiscoveryBusiness } from '@/types/domain';

export function BusinessResults({ businesses }: { businesses: DiscoveryBusiness[] }) {
  if (businesses.length === 0) return <EmptyState />;

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:gap-6 xl:grid-cols-3">
      {businesses.map((business) => (
        <BusinessCard key={business.id} business={business} />
      ))}
    </div>
  );
}
