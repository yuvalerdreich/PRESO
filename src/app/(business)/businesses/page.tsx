import { MyBusinessesPage } from '@/components/business/my-businesses-page';
import { discoveryRepository } from '@/lib/discovery/repository';

export default async function BusinessesRoute() {
  const joinableBusinesses = await discoveryRepository.searchBusinesses();

  return <MyBusinessesPage joinableBusinesses={joinableBusinesses} />;
}
