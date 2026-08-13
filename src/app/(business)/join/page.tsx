import { JoinPage } from '@/components/business/join-page';
import { businessEntryRepository } from '@/lib/business-entry/repository';

export default async function JoinRoute() {
  const businesses = await businessEntryRepository.listJoinableBusinesses();

  return <JoinPage businesses={businesses} />;
}
