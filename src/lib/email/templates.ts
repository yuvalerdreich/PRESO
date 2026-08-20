import type { EmailMessage } from '@/lib/email/send';
import { toDateISO, toTimeHHmm, DEFAULT_TIME_ZONE } from '@/lib/time';
import type { NotificationType } from '@/types/domain';

/**
 * The transactional half of a notification, rendered from the same `payload` the in-app half reads
 * (§3.11). One function per `notification_type`, so a new enum value fails the build here rather
 * than silently sending nothing.
 *
 * Hebrew and right-to-left, like every other user-facing string in this app — the `lib/i18n/`
 * dictionary is a React context and cannot be read from a webhook, so these are authored directly.
 * Times are rendered in the **business's** timezone, carried in the payload for exactly this
 * reason: the server's own zone is UTC on Vercel and neither party's zone anywhere else.
 *
 * `null` means "this type has no email", not "an error" — the in-app notification still stands.
 */
type Payload = Record<string, unknown>;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export function renderNotificationEmail(
  type: NotificationType,
  payload: Payload,
  recipient: string,
): EmailMessage | null {
  switch (type) {
    case 'WAITLIST_MATCHED':
      return waitlistMatched(payload, recipient);
    case 'APPOINTMENT_CANCELLED':
      return simple(recipient, 'התור שלך בוטל', [
        `התור${serviceSuffix(payload)} בוטל.`,
        whenLine(payload),
        'ניתן לקבוע תור חדש דרך האזור האישי.',
      ]);
    case 'APPOINTMENT_CONFIRMED':
      return simple(recipient, 'התור שלך אושר', [
        `התור${serviceSuffix(payload)} אושר.`,
        whenLine(payload),
      ]);
    case 'APPOINTMENT_REJECTED':
      return simple(recipient, 'בקשת התור לא אושרה', [
        `בקשת התור${serviceSuffix(payload)} לא אושרה.`,
        whenLine(payload),
        'אפשר לבחור מועד אחר או להצטרף לרשימת ההמתנה.',
      ]);
    case 'APPOINTMENT_RESCHEDULED':
      return simple(recipient, 'התור שלך הועבר למועד אחר', [
        `התור${serviceSuffix(payload)} הועבר למועד חדש.`,
        whenLine(payload),
      ]);
    case 'APPOINTMENT_CREATED':
      return simple(recipient, 'נקבע תור חדש', [
        `נקבע תור חדש${serviceSuffix(payload)}.`,
        whenLine(payload),
      ]);
    case 'JOIN_REQUEST_RECEIVED':
      return simple(recipient, 'התקבלה בקשת הצטרפות לצוות', [
        'איש מקצוע ביקש להצטרף לצוות העסק שלך.',
        'הבקשה ממתינה לאישורך במסך ניהול הצוות.',
      ]);
    case 'JOIN_REQUEST_DECIDED':
      return simple(recipient, 'בקשת ההצטרפות שלך נענתה', [
        'בעל/ת העסק החליט/ה לגבי בקשת ההצטרפות שלך.',
        'הפרטים המלאים מופיעים באזור האישי.',
      ]);
    default:
      return null;
  }
}

/**
 * The one email this whole path exists for. A cancellation frees a slot, the matcher notifies
 * **every** eligible entry at once (§12.15), and the claim is decided by whoever gets there first —
 * so the email has to say plainly that the slot is not being held, or the first person to read it
 * an hour later will believe it was.
 */
function waitlistMatched(payload: Payload, recipient: string): EmailMessage {
  const business = text(payload.businessName) || 'העסק';
  const service = text(payload.serviceName);
  const claimUrl = `${SITE_URL}/me/waitlist`;

  const lines = [
    `התפנה תור ב${business}${service ? ` עבור ${service}` : ''}.`,
    whenLine(payload),
    'התור מוצע לכל הממתינים ברשימה בו-זמנית ואינו שמור — מי שיאשר ראשון/ה יקבל/תקבל אותו.',
    text(payload.claimExpiresAt)
      ? `ניתן לאשר עד ${formatInstant(payload.claimExpiresAt, payload.timezone)}.`
      : '',
  ].filter(Boolean);

  return {
    to: recipient,
    subject: `התפנה תור ב${business}`,
    text: [...lines, claimUrl].join('\n'),
    html: wrap(lines, { label: 'לצפייה ואישור התור', href: claimUrl }),
  };
}

function simple(recipient: string, subject: string, lines: string[]): EmailMessage {
  const body = lines.filter(Boolean);
  const action = { label: 'לאזור האישי', href: `${SITE_URL}/me/appointments` };

  return {
    to: recipient,
    subject,
    text: [...body, action.href].join('\n'),
    html: wrap(body, action),
  };
}

/** Inline styles only, and a table-free layout: email clients drop stylesheets and most of CSS. */
function wrap(lines: string[], action: { label: string; href: string }): string {
  const paragraphs = lines
    .map((line) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#151b36">${escape(line)}</p>`)
    .join('');

  return `<div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;background:#faf9ff;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e7f2;border-radius:16px;padding:24px">
    <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#34238d">Preso</p>
    ${paragraphs}
    <a href="${escape(action.href)}" style="display:inline-block;margin-top:8px;background:#1e3a8a;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:10px 18px;border-radius:999px">${escape(action.label)}</a>
  </div>
</div>`;
}

function whenLine(payload: Payload): string {
  const startsAt = text(payload.startsAt);
  if (!startsAt) return '';
  return `מועד: ${formatInstant(payload.startsAt, payload.timezone)}`;
}

function serviceSuffix(payload: Payload): string {
  const service = text(payload.serviceName);
  const business = text(payload.businessName);

  if (service && business) return ` ל${service} ב${business}`;
  if (business) return ` ב${business}`;
  if (service) return ` ל${service}`;
  return '';
}

function formatInstant(value: unknown, timezone: unknown): string {
  const raw = text(value);
  if (!raw) return '';

  const instant = new Date(raw);
  if (Number.isNaN(instant.getTime())) return '';

  const zone = text(timezone) || DEFAULT_TIME_ZONE;
  return `${toDateISO(instant, zone)} ${toTimeHHmm(instant, zone)}`;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
