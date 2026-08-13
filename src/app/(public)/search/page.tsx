import { DiscoverySearchPage } from '@/components/public/discovery-search-page';
import { discoveryRepository, type DiscoveryFilters } from '@/lib/discovery/repository';

type SearchPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function readFilter(value: string | string[] | undefined) {
  const item = Array.isArray(value) ? value[0] : value;
  return item?.trim() || undefined;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const filters: DiscoveryFilters = {
    q: readFilter(params.q),
    category: readFilter(params.category),
    area: readFilter(params.area),
  };
  const [categories, areas, businesses] = await Promise.all([
    discoveryRepository.listCategories(),
    discoveryRepository.listAreas(),
    discoveryRepository.searchBusinesses(filters),
  ]);

  return (
    <DiscoverySearchPage
      categories={categories}
      areas={areas}
      businesses={businesses}
      filters={filters}
    />
  );
}
