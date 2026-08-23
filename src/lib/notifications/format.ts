import { toDateISO, toTimeHHmm, DEFAULT_TIME_ZONE } from '@/lib/time';
import type { Translation } from '@/lib/i18n/translations';
import type { NotificationType } from '@/types/domain';

/**
 * Renders one `notifications` row for the bell popover (TECHNICAL_DESIGN.md §12.x — the in-app
 * replacement for the deleted `lib/email/templates.ts`). Unlike that file, this one goes through
 * `lib/i18n/` properly — the popover is real bilingual UI, not a Hebrew-only email — so instead of
 * composing a full grammatical sentence (Hebrew attaches prefixes like "ל"/"ב" directly to the
 * next word, English doesn't, and reconciling that generically wasn't worth it for a compact list
 * row) each row is title + a "business · service" meta line + a date/time line, which sidesteps
 * the grammar problem entirely and reads fine in both directions.
 */
export type FormattedNotification = {
  title: string;
  meta: string | null;
  when: string | null;
  /** Only set for WAITLIST_MATCHED today — the one type where waiting doesn't hold the slot. */
  note: string | null;
  /** Only set for JOIN_REQUEST_DECIDED — the outcome, shown in the row itself before any click. */
  status: { label: string; tone: 'success' | 'error' } | null;
  href: string | null;
};

type Payload = Record<string, unknown>;

const APPOINTMENT_TYPES: NotificationType[] = [
  'APPOINTMENT_REMINDER',
  'APPOINTMENT_CREATED',
  'APPOINTMENT_CONFIRMED',
  'APPOINTMENT_CANCELLED',
  'APPOINTMENT_RESCHEDULED',
  'APPOINTMENT_REJECTED',
];

/**
 * A plain navigation to `/me/appointments`, deliberately — the alternative (opening the shared
 * `AppointmentsPanelContext` modal in place) only exists inside `(public)/layout.tsx`'s tree; the
 * bell itself renders from all four chrome-composing layouts (`(public)`, `(business)`, `(admin)`,
 * `(client)/me`), and only one of them provides that context.
 */
const APPOINTMENTS_HREF = '/me/appointments';

/**
 * `/businesses` — "my businesses" — is where both join-request notification types send the caller.
 * Deliberately not a deeper link into a specific business's staff screen for JOIN_REQUEST_RECEIVED
 * (the business owner's side): reaching `/businesses/manage/staff` directly depends on which
 * business the "current business" cookie currently points to (`selectBusinessForManagement`,
 * §12.64), and a caller who owns or works at more than one business could land on the wrong one's
 * roster. `/businesses` is always correct and lets them pick.
 */
const BUSINESSES_HREF = '/businesses';

export function formatNotification(
  type: NotificationType,
  payload: Payload,
  copy: Translation,
): FormattedNotification {
  const title = copy.notifications.typeTitles[type];
  const meta = metaLine(payload);
  const when = whenLine(payload);

  if (type === 'WAITLIST_MATCHED') {
    const businessId = text(payload.businessId);
    const employeeId = text(payload.employeeId);
    const serviceId = text(payload.serviceId);
    const waitlistEntryId = text(payload.waitlistEntryId);
    const dateISO = toDateOnly(payload.startsAt, payload.timezone);

    let href: string | null = null;
    if (businessId && employeeId && serviceId) {
      const params = new URLSearchParams();
      if (dateISO) params.set('date', dateISO);
      if (waitlistEntryId) params.set('claim', waitlistEntryId);
      const query = params.toString();
      href = `/b/${businessId}/e/${employeeId}/s/${serviceId}${query ? `?${query}` : ''}`;
    }

    const claimExpiresAt = formatInstant(payload.claimExpiresAt, payload.timezone);
    const note = claimExpiresAt ? `${copy.notifications.claimBy} ${claimExpiresAt}` : null;

    return { title, meta, when, note, status: null, href };
  }

  if (type === 'APPOINTMENT_REJECTED') {
    const reason = text(payload.reason);
    return {
      title,
      meta,
      when,
      note: reason ? `${copy.notifications.reasonPrefix} ${reason}` : null,
      status: null,
      href: APPOINTMENTS_HREF,
    };
  }

  if (type === 'JOIN_REQUEST_DECIDED') {
    const decision = text(payload.decision);
    const status =
      decision === 'APPROVED'
        ? { label: copy.notifications.joinApproved, tone: 'success' as const }
        : decision === 'REJECTED'
          ? { label: copy.notifications.joinRejected, tone: 'error' as const }
          : null;

    return { title, meta, when, note: null, status, href: BUSINESSES_HREF };
  }

  if (type === 'JOIN_REQUEST_RECEIVED') {
    return { title, meta, when, note: null, status: null, href: BUSINESSES_HREF };
  }

  const href = APPOINTMENT_TYPES.includes(type) ? APPOINTMENTS_HREF : null;
  return { title, meta, when, note: null, status: null, href };
}

function metaLine(payload: Payload): string | null {
  const business = text(payload.businessName);
  const service = text(payload.serviceName);
  return [business, service].filter(Boolean).join(' · ') || null;
}

function whenLine(payload: Payload): string | null {
  return formatInstant(payload.startsAt, payload.timezone);
}

function toDateOnly(value: unknown, timezone: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const instant = new Date(raw);
  if (Number.isNaN(instant.getTime())) return null;
  return toDateISO(instant, text(timezone) || DEFAULT_TIME_ZONE);
}

function formatInstant(value: unknown, timezone: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;

  const instant = new Date(raw);
  if (Number.isNaN(instant.getTime())) return null;

  const zone = text(timezone) || DEFAULT_TIME_ZONE;
  return `${toDateISO(instant, zone)} ${toTimeHHmm(instant, zone)}`;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
