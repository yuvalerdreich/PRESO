import { MyBusinessesPage } from '@/components/business/my-businesses-page';
import { searchBusinesses } from '@/server/queries/discovery';

export default async function BusinessesRoute() {
  const joinableBusinesses = await searchBusinesses();

  return <MyBusinessesPage joinableBusinesses={joinableBusinesses} />;
}
