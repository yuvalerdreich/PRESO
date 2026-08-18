import { DiscoveryBrowser } from '@/components/public/discovery-browser';
import { listBusinessAreas, listCategories, searchBusinesses } from '@/server/queries/discovery';

export default async function HomePage() {
  const [categories, areas, businesses] = await Promise.all([
    listCategories(),
    listBusinessAreas(),
    searchBusinesses(),
  ]);

  return <DiscoveryBrowser businesses={businesses} categories={categories} areas={areas} />;
}
