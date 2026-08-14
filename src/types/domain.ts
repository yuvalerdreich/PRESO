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
  /** `AUTO` confirms a booking immediately; `MANUAL` leaves it `PENDING` until the business approves it (TECHNICAL_DESIGN.md §6.2 step 5). */
  approvalPolicy: 'AUTO' | 'MANUAL';
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
  description: LocalizedText;
  price: number;
  durationMinutes: number;
  bufferMinutes: number;
  status: 'ACTIVE' | 'INACTIVE';
};

export type BusinessSearchFilters = {
  q?: string;
  category?: string;
  area?: string;
};
