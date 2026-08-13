import type { BusinessImageVariant, LocalizedText } from '@/types/domain';

export type BusinessEntryCategory = {
  id: string;
  name: LocalizedText;
};

export type BusinessEntryArea = {
  id: string;
  name: LocalizedText;
};

export type JoinableBusiness = {
  id: string;
  name: LocalizedText;
  category: BusinessEntryCategory;
  area: BusinessEntryArea;
  address: LocalizedText;
  imageVariant: BusinessImageVariant;
};
