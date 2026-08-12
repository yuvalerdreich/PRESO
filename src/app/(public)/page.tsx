import { DiscoveryHome } from '@/components/discovery/discovery-home';
import { discoveryRepository } from '@/lib/discovery/repository';

export default async function HomePage() {
  const [categories, areas, businesses] = await Promise.all([
    discoveryRepository.listCategories(),
    discoveryRepository.listAreas(),
    discoveryRepository.searchBusinesses({}),
  ]);

  return <DiscoveryHome categories={categories} areas={areas} businesses={businesses} />;
}
