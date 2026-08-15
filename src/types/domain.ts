export type LocalizedText = { he: string; en: string };

export type CategoryIconId = 'graduation-cap' | 'stethoscope' | 'dumbbell' | 'sparkles' | 'scissors';

export type Category = {
  id: string;
  icon: CategoryIconId;
  name: LocalizedText;
};

export type BusinessSummary = {
  id: string;
  /**
   * Real business/employee/service content is whatever single language the business owner
   * entered — the DB schema (TECHNICAL_DESIGN.md §3) has no per-field translation columns,
   * unlike `Category.name` above, which stays `LocalizedText` because it's sourced from the
   * app's own `src/lib/i18n/` dictionary, not the database.
   */
  name: string;
  categoryId: string;
  /** Free text (TECHNICAL_DESIGN.md §12.20) — no curated `areas` table exists. */
  area: string;
  address: string;
  description: string;
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
  fullName: string;
  positionTitle: string;
  avatarUrl: string;
};

export type ServiceSummary = {
  id: string;
  employeeId: string;
  name: string;
  description: string;
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
