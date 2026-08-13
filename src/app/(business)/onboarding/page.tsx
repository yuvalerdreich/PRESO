import { OnboardingPage } from '@/components/business/onboarding-page';
import { businessEntryRepository } from '@/lib/business-entry/repository';

export default async function OnboardingRoute() {
  const [categories, areas] = await Promise.all([
    businessEntryRepository.listCategories(),
    businessEntryRepository.listAreas(),
  ]);

  return <OnboardingPage categories={categories} areas={areas} />;
}
