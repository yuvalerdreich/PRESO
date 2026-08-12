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

export type BusinessHours = {
  day: LocalizedText;
  opensAt: string;
  closesAt: string;
};

export type BusinessProfile = DiscoveryBusiness & {
  phone: string;
  hours: BusinessHours[];
};

export type EmployeeAvatarVariant = 'violet' | 'rose' | 'amber' | 'teal';

export type BusinessEmployee = {
  id: string;
  businessId: string;
  name: LocalizedText;
  position: LocalizedText;
  introduction: LocalizedText;
  avatarVariant: EmployeeAvatarVariant;
};

export type EmployeeService = {
  id: string;
  employeeId: string;
  name: LocalizedText;
  description: LocalizedText;
  durationMinutes: number;
  price: number;
};
