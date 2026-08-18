import { MyBusinessesPage } from '@/components/business/my-businesses-page';
import { listCategories, listJoinableBusinesses, listMyBusinesses } from '@/server/queries/business-entry';

export default async function BusinessesRoute() {
  const [businesses, joinableBusinesses, categories] = await Promise.all([
    listMyBusinesses(),
    listJoinableBusinesses(),
    listCategories(),
  ]);

  return (
    <MyBusinessesPage
      businesses={businesses}
      joinableBusinesses={joinableBusinesses}
      categories={categories}
    />
  );
}
