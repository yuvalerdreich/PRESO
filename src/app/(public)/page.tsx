import { DiscoveryBrowser } from '@/components/public/discovery-browser';
import {
  getBusinessProfile,
  listBusinessAreas,
  listCategories,
  searchBusinessesPaged,
} from '@/server/queries/discovery';

const HOME_PAGE_SIZE = 20;

export default async function HomePage({ searchParams }: PageProps<'/'>) {
  const params = await searchParams;
  // §12.55 — set when a booking URL for the viewer's own business bounced back here.
  const blockedId = typeof params.blocked === 'string' ? params.blocked : undefined;

  const [categories, areas, result, blockedBusiness] = await Promise.all([
    listCategories(),
    listBusinessAreas(),
    searchBusinessesPaged({ page: 1, pageSize: HOME_PAGE_SIZE, sort: 'relevance' }),
    blockedId ? getBusinessProfile(blockedId) : Promise.resolve(null),
  ]);

  return (
    <DiscoveryBrowser
      categories={categories}
      areas={areas}
      initialResult={result}
      blockedBusiness={
        blockedBusiness?.viewerRelation
          ? { id: blockedBusiness.id, name: blockedBusiness.name, viewerRelation: blockedBusiness.viewerRelation }
          : null
      }
    />
  );
}
