export type LocalizedText = { he: string; en: string };

export type CategoryIconId = 'graduation-cap' | 'stethoscope' | 'dumbbell' | 'sparkles' | 'scissors';

export type Category = {
  id: string;
  icon: CategoryIconId;
  name: LocalizedText;
};

export type BusinessArea = {
  id: string;
  name: LocalizedText;
};

export type BusinessSummary = {
  id: string;
  name: LocalizedText;
  categoryId: string;
  area: BusinessArea;
  address: LocalizedText;
  description: LocalizedText;
  photoUrl: string;
  employeeCount: number;
  employeeAvatarUrls: string[];
};

export type BusinessProfile = BusinessSummary & {
  phone: string;
};

export type EmployeeSummary = {
  id: string;
  businessId: string;
  fullName: LocalizedText;
  positionTitle: LocalizedText;
  avatarUrl: string;
};

export type ServiceSummary = {
  id: string;
  employeeId: string;
  name: LocalizedText;
  price: number;
  durationMinutes: number;
  status: 'ACTIVE' | 'INACTIVE';
};

export type BusinessSearchFilters = {
  q?: string;
  category?: string;
  area?: string;
};
