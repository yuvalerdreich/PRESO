import { BusinessResults } from '@/components/public/business-results';
import { DiscoveryHome } from '@/components/public/discovery-home';
import { discoveryRepository } from '@/lib/discovery/repository';

export default async function HomePage() {
  const [categories, businesses] = await Promise.all([
    discoveryRepository.listCategories(),
    discoveryRepository.searchBusinesses(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6">
      <DiscoveryHome />
      <BusinessResults businesses={businesses} categories={categories} />
    </div>
  );
}
