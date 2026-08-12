import type { Locale } from '@/lib/i18n/types';

export type LocalizedText = Record<Locale, string>;

export type DiscoveryCategory = {
  id: string;
  slug: string;
  name: LocalizedText;
};

export type DiscoveryArea = {
  id: string;
  name: LocalizedText;
};

export type BusinessImageVariant = 'studio' | 'clinic' | 'fitness';

export type DiscoveryBusiness = {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  category: DiscoveryCategory;
  area: DiscoveryArea;
  address: LocalizedText;
  imageVariant: BusinessImageVariant;
  employeeCount: number;
};
