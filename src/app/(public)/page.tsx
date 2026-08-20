import { DiscoveryBrowser } from '@/components/public/discovery-browser';
import { listBusinessAreas, listCategories, searchBusinesses } from '@/server/queries/discovery';

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  const params = await searchParams;
  const [categories, areas, businesses] = await Promise.all([
    listCategories(),
    listBusinessAreas(),
    searchBusinesses(),
  ]);

  return (
    <DiscoveryBrowser
      businesses={businesses}
      categories={categories}
      areas={areas}
      // §12.55 — set when a booking URL for the viewer's own business bounced back here.
      blockedBusinessId={typeof params.blocked === 'string' ? params.blocked : undefined}
    />
  );
}
