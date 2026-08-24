import type { Database } from '@/types/database.types';

/**
 * Hand-written view models (TECHNICAL_DESIGN.md §1: `types/domain.ts`). One file, deliberately:
 * these are the shapes `server/queries/*` returns and components consume, and splitting them by
 * feature made it easy to end up with three subtly different ideas of "an appointment".
 *
 * The rule dividing this file from `database.types.ts`: that file is **generated** and mirrors
 * the schema exactly (snake_case columns, `tstzrange` as `unknown`, nullable everywhere the DDL
 * is). This one is camelCase, resolved, and shaped for rendering. Nothing outside
 * `server/queries/*` should need to touch the generated types.
 */

// ---------------------------------------------------------------------------
// Enums — aliased from the generated types, never re-typed by hand
// ---------------------------------------------------------------------------

/**
 * Every domain enum points at `database.types.ts`, so a migration that adds or renames an enum
 * value fails the build here rather than silently disagreeing with the database. Re-declaring
 * these as string unions is the obvious shortcut and the reason to avoid it.
 */
type Enums = Database['public']['Enums'];

export type AccountType = Enums['account_type'];
export type ProfileStatus = Enums['profile_status'];
export type BusinessStatus = Enums['business_status'];
export type ApprovalPolicy = Enums['approval_policy'];
export type EmployeeStatus = Enums['employee_status'];
export type ServiceStatus = Enums['service_status'];
export type AvailabilityRuleKind = Enums['availability_rule_kind'];
export type JoinRequestStatus = Enums['join_request_status'];
export type WaitlistStatus = Enums['waitlist_status'];
export type NotificationType = Enums['notification_type'];
export type ReportStatus = Enums['report_status'];
export type ReportTargetType = Enums['report_target_type'];

/**
 * `PENDING | CONFIRMED | CANCELLED` — the database's casing, not a lowercase UI variant.
 *
 * These values cross the API boundary (`POST /api/appointments` answers
 * `status: 'PENDING'|'CONFIRMED'` per §5.4) and come straight back out of the booking RPCs, so
 * carrying a second lowercase spelling internally only bought a translation step in each
 * direction and a place for the two to drift. The bilingual *labels* remain a separate concern
 * and still live in `lib/i18n/`, keyed independently of this enum.
 */
export type AppointmentStatus = Enums['appointment_status'];

// ---------------------------------------------------------------------------
// Public discovery and booking
// ---------------------------------------------------------------------------

export type CategoryIconId = 'graduation-cap' | 'stethoscope' | 'dumbbell' | 'sparkles' | 'scissors';

export type Category = {
  id: string;
  /**
   * The stable key. `categories.id` is a per-environment `gen_random_uuid()`, so local, hosted
   * and CI all disagree on it — `slug` is what a `?category=` URL carries.
   */
  slug: string;
  /** `categories.icon`, validated against the finite set the UI has a component for (see the icon
   *  catalogue in components/public/category-chips.tsx). */
  icon: CategoryIconId;
  /** `categories.name`, verbatim — the DB is the only source, no app-code override. */
  name: string;
};

export type BusinessSummary = {
  id: string;
  /**
   * Real business/employee/service content is whatever single language the business owner
   * entered — the DB schema (TECHNICAL_DESIGN.md §3) has no per-field translation columns.
   * `Category.name` above is the same shape now, for the same reason.
   */
  name: string;
  categoryId: string;
  /** Free text (TECHNICAL_DESIGN.md §12.20) — no curated `areas` table exists. */
  area: string;
  address: string;
  description: string;
  /** Resolved from `businesses.photo_paths[0]` via Supabase Storage. */
  photoUrl: string;
  employeeCount: number;
  employeeAvatarUrls: string[];
  /**
   * Staff names, so a client-side search can match a business by the stylist they know — §12.22's
   * "search matches the owner's name" rule, applied where the filtering now happens (§12.43).
   * The server already loads these names to count staff; it used to drop them on the floor.
   */
  employeeNames: string[];
  /** `AUTO` confirms a booking immediately; `MANUAL` leaves it `PENDING` until the business approves it (TECHNICAL_DESIGN.md §6.2 step 5). */
  approvalPolicy: ApprovalPolicy;
  /**
   * How the signed-in viewer relates to this business — `null` for anonymous visitors and for
   * everyone else's businesses (§12.55).
   *
   * It exists on the *summary* rather than only on the profile because the discovery grid badges
   * "העסק שלך" before anyone opens anything, and because the same value decides whether the
   * business page renders its booking flow at all. `book_appointment()` refuses the booking
   * regardless; this is what stops the UI offering it.
   */
  viewerRelation: ViewerBusinessRelation | null;
};

/** Own it, or work at it. `OWNER` wins when both are true, which §6.8 rule 3 makes the usual case. */
export type ViewerBusinessRelation = 'OWNER' | 'STAFF';

export type BusinessProfile = BusinessSummary & {
  phone: string;
  /** IANA zone (§12.3). Every date and time shown for this business is rendered through it. */
  timezone: string;
  /** §12.2 — a client may cancel online up to N hours before the start. Staff always may. */
  cancellationWindowHours: number;
  ownerProfileId: string;
};

/** One row of `GET /api/businesses` (§5.2), which carries more than a card needs. */
export type BusinessSearchResultItem = BusinessSummary & {
  category: { id: string; slug: string; name: string };
  /** Across all ACTIVE services of all ACTIVE employees; `null` when the business has none. */
  priceRange: { min: number; max: number } | null;
  /** §6.6's `get_next_available()`; `null` unless the query asked for it. */
  nextAvailableAt: string | null;
};

export type BusinessSearchResult = {
  items: BusinessSearchResultItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type EmployeeSummary = {
  id: string;
  businessId: string;
  fullName: string;
  positionTitle: string;
  avatarUrl: string;
};

/**
 * `GET /api/businesses/[id]/employees` (§5.3) — a roster row, not the booking-page view model.
 * `serviceCount` is what lets the UI explain an unbookable employee instead of showing an empty
 * service list (§12.10: an employee with zero services is selectable but unbookable).
 */
export type EmployeeListItem = {
  id: string;
  profileId: string;
  fullName: string;
  positionTitle: string;
  status: EmployeeStatus;
  serviceCount: number;
};

export type ServiceSummary = {
  id: string;
  employeeId: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  bufferMinutes: number;
  status: ServiceStatus;
};

export type BusinessSearchFilters = {
  q?: string;
  category?: string;
  area?: string;
};

/**
 * One bookable slot, as `get_available_slots()` returns it. Both instants are absolute; the
 * `dateISO`/`time` pair is the same instant rendered in the business's timezone, resolved once
 * server-side so no component has to know about `date-fns-tz`.
 */
export type Slot = {
  startsAt: string;
  endsAt: string;
  dateISO: string;
  time: string;
};

export type SlotList = {
  employeeId: string;
  serviceId: string;
  timezone: string;
  slots: Slot[];
};

// ---------------------------------------------------------------------------
// Client portal
// ---------------------------------------------------------------------------

export type ClientAppointment = {
  id: string;
  /** Present on appointment rows read from the database; legacy/demo callers may omit them. */
  businessId?: string;
  employeeId?: string;
  serviceId?: string;
  /** Real business/employee/service names are single-language — see `BusinessSummary.name`. */
  businessName: string;
  employeeName: string;
  serviceName: string;
  address: string;
  /** ISO date (YYYY-MM-DD) **in the business's timezone**. Past dates fall into the history tab regardless of status. */
  dateISO: string;
  /** "HH:mm" start time, likewise in the business's timezone. */
  time: string;
  status: AppointmentStatus;
};

export type ClientWaitlistEntry = {
  id: string;
  businessName: string;
  employeeName: string;
  serviceName: string;
  requestedDateISO: string;
  requestedRange: string;
  status: WaitlistStatus;
};

/** Everything needed to create a `ClientAppointment` row, minus its generated `id`. */
export type CreateAppointmentInput = Omit<ClientAppointment, 'id'>;

export type NotificationItem = {
  id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Business portal — onboarding and joining
// ---------------------------------------------------------------------------

export type BusinessCategory = { id: string; slug: string; name: string };

/** §12.20 — `businesses.area` is free text, so the options are whatever is already in use. */
export type BusinessArea = { id: string; name: string };

export type JoinableBusiness = {
  id: string;
  name: string;
  area: string;
  categoryName: string;
  employeeCount: number;
  /** The caller's own request, when one exists — drives "Requested" vs "Request to join". */
  pendingRequestStatus: JoinRequestStatus | null;
};

/**
 * How the caller is attached to one business, for `/businesses` ("My businesses").
 *
 * `OWNER` and `STAFF` both come from an `employees` row — the difference is only
 * `businesses.owner_profile_id`, since `employees` is a *position* and the founder holds one
 * like everybody else (§2). `PENDING` is the third state and has **no** `employees` row at all:
 * §6.8 rule 5 means approval is what creates staff, so a pending applicant is a `join_requests`
 * row and nothing more. That is why this is one union rather than a flag on an employment.
 */
export type MyBusinessRelation = 'OWNER' | 'STAFF' | 'PENDING';

export type MyBusiness = {
  /** `employees.id` for OWNER/STAFF, `join_requests.id` for PENDING — unique either way. */
  key: string;
  businessId: string;
  name: string;
  area: string;
  address: string;
  categoryName: string;
  photoUrl: string;
  employeeCount: number;
  /** Open staff applications to this business; populated only for its owner. */
  pendingJoinRequestCount: number;
  relation: MyBusinessRelation;
  /** The caller's own position title; null while the request is still pending. */
  positionTitle: string | null;
  /** An approved-but-deactivated position still shows here, flagged (§6.9's soft retire). */
  employeeStatus: EmployeeStatus | null;
};

// ---------------------------------------------------------------------------
// Business portal — dashboard
// ---------------------------------------------------------------------------

export type DashboardBusiness = {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  description: string;
  address: string;
  area: string;
  phone: string;
  photoUrl: string;
  /** What was actually stored in `photo_paths[1]` — the settings form edits this, not the resolved
   *  URL, so a Storage object path round-trips instead of being rewritten to a signed URL. */
  photoRef: string;
  timezone: string;
  approvalPolicy: ApprovalPolicy;
  cancellationWindowHours: number;
  paymentNotes: string;
  bookingNotes: string;
  status: BusinessStatus;
  /** Whether the caller founded this business — the one capability an employee lacks (§12.1). */
  isOwner: boolean;
};

/**
 * The badge numbers on the dashboard header's section nav. Each one answers "how much is waiting
 * for me here", which is why appointments are counted for *today* and the others by what is live:
 * a nav badge is a workload cue, not a lifetime total.
 */
export type DashboardNavCounts = {
  appointmentsToday: number;
  activeStaff: number;
  activeServices: number;
  openWaitlist: number;
};

export type DashboardEmployee = {
  id: string;
  profileId: string;
  fullName: string;
  avatarUrl: string;
  positionTitle: string;
  status: EmployeeStatus;
  /**
   * Contact details of a colleague, from `business_staff_contacts` (0021) — null only if that
   * view's predicate excluded the caller, never because the column is missing.
   */
  phone: string | null;
  email: string | null;
  serviceCount: number;
  isOwner: boolean;
};

export type DashboardService = {
  id: string;
  employeeId: string;
  employeeName: string;
  name: string;
  /** `services.description` (0015) — already rendered publicly; the dashboard form writes it. */
  description: string;
  price: number;
  durationMinutes: number;
  bufferMinutes: number;
  status: ServiceStatus;
};

export type DashboardAppointment = {
  id: string;
  employeeId: string;
  employeeName: string;
  clientName: string;
  clientPhone: string | null;
  serviceId: string;
  serviceName: string;
  dateISO: string;
  time: string;
  status: AppointmentStatus;
};

/**
 * One row of `/businesses/manage/waitlist` — a client waiting to be told when a slot frees up.
 *
 * `employeeName`/`serviceName` are empty when the entry names none: §3.10 lets an entry mean "any
 * employee, any service", which is a real choice the client made rather than missing data, so the
 * screen labels it rather than rendering a blank.
 */
export type DashboardWaitlistEntry = {
  id: string;
  clientName: string;
  clientPhone: string | null;
  employeeNames: string[];
  serviceName: string;
  /** The requested window, rendered in the business's timezone. */
  fromDateISO: string;
  fromTime: string;
  toDateISO: string;
  toTime: string;
  status: WaitlistStatus;
  createdAt: string;
  /** When the matcher offered this client a freed slot — `null` until then (§6.7). */
  matchedAt: string | null;
};

export type DashboardKpi = {
  id: 'appointments-today' | 'active-staff' | 'pending-approval' | 'revenue';
  value: number;
  /** Revenue has no source column; it is derived from service prices and flagged as such. */
  isMock?: boolean;
};

export type JoinRequestSummary = {
  id: string;
  businessId: string;
  businessName: string;
  profileId: string;
  fullName: string;
  /** From `business_join_request_contacts` (0021) — the founder decides on a person, not an id. */
  phone: string | null;
  email: string | null;
  status: JoinRequestStatus;
  createdAt: string;
};

export type AvailabilityRule = {
  id: string;
  employeeId: string;
  kind: AvailabilityRuleKind;
  /** 0 = Sunday. Set for `WEEKLY_WINDOW` only. */
  dayOfWeek: number | null;
  /** "HH:mm". Set for `WEEKLY_WINDOW` and `EXCEPTION`. */
  startsAt: string | null;
  endsAt: string | null;
  /** Set for `EXCEPTION`, `VACATION` and `BLOCK`. */
  effectiveFrom: string | null;
  effectiveTo: string | null;
  /**
   * §12.68 — optional, set only for `WEEKLY_WINDOW`/`EXCEPTION`. Null means the window offers
   * every one of the employee's services, exactly as before this field existed; set, it offers
   * only that one service.
   */
  serviceId: string | null;
};

export type BusinessHourRow = {
  id: string;
  dayOfWeek: number;
  opensAt: string;
  closesAt: string;
};

// ---------------------------------------------------------------------------
// Admin console
// ---------------------------------------------------------------------------

export type AdminUser = {
  id: string;
  fullName: string;
  phone: string | null;
  accountType: AccountType;
  status: ProfileStatus;
  createdAt: string;
};

export type AdminBusiness = {
  id: string;
  name: string;
  ownerName: string;
  categoryName: string;
  area: string;
  status: BusinessStatus;
  employeeCount: number;
  createdAt: string;
};

export type ReportSummary = {
  id: string;
  targetType: ReportTargetType;
  /** `null` for a GENERAL report — it has no target (TECHNICAL_DESIGN.md §12.76). */
  targetId: string | null;
  /** A human-readable name for `targetId`, resolved per `targetType`; `null` for GENERAL. */
  targetLabel: string | null;
  reporterName: string;
  description: string;
  status: ReportStatus;
  resolutionNote: string | null;
  createdAt: string;
};
