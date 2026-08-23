import { describe, expect, it } from 'vitest';

import { formatNotification } from '@/lib/notifications/format';
import { translations } from '@/lib/i18n/translations';

const copy = translations.en;

describe('formatNotification', () => {
  it('renders a business · service meta line and the date/time in the given zone', () => {
    const formatted = formatNotification(
      'APPOINTMENT_CONFIRMED',
      {
        businessName: 'Studio Zohar',
        serviceName: 'Haircut',
        startsAt: '2026-08-25T06:00:00.000Z',
        timezone: 'Asia/Jerusalem',
      },
      copy,
    );

    expect(formatted.title).toBe(copy.notifications.typeTitles.APPOINTMENT_CONFIRMED);
    expect(formatted.meta).toBe('Studio Zohar · Haircut');
    // 06:00 UTC is 09:00 in Jerusalem — the zone comes from the payload for exactly this reason.
    expect(formatted.when).toBe('2026-08-25 09:00');
    expect(formatted.note).toBeNull();
  });

  it('links appointment-type notifications to /me/appointments, not a modal context', () => {
    for (const type of [
      'APPOINTMENT_REMINDER',
      'APPOINTMENT_CREATED',
      'APPOINTMENT_CONFIRMED',
      'APPOINTMENT_CANCELLED',
      'APPOINTMENT_RESCHEDULED',
    ] as const) {
      expect(formatNotification(type, {}, copy).href).toBe('/me/appointments');
    }
  });

  it('composes the reschedule message from the previous start time, not the new one', () => {
    const formatted = formatNotification(
      'APPOINTMENT_RESCHEDULED',
      {
        businessName: 'Studio Zohar',
        serviceName: 'Haircut',
        employeeName: 'Noa Golan',
        startsAt: '2026-08-26T06:00:00.000Z',
        previousStartsAt: '2026-08-25T06:00:00.000Z',
        timezone: 'Asia/Jerusalem',
      },
      copy,
    );

    expect(formatted.title).toBe(
      'Your appointment at Studio Zohar for Haircut with Noa Golan on 2026-08-25 09:00 was updated',
    );
    expect(formatted.meta).toBeNull();
    expect(formatted.when).toBeNull();
    expect(formatted.href).toBe('/me/appointments');
  });

  it('composes the cancellation message from the appointment\'s own start time', () => {
    const formatted = formatNotification(
      'APPOINTMENT_CANCELLED',
      {
        businessName: 'Studio Zohar',
        serviceName: 'Haircut',
        employeeName: 'Noa Golan',
        startsAt: '2026-08-25T06:00:00.000Z',
        timezone: 'Asia/Jerusalem',
      },
      copy,
    );

    expect(formatted.title).toBe(
      'Your appointment at Studio Zohar for Haircut with Noa Golan on 2026-08-25 09:00 was cancelled',
    );
    expect(formatted.meta).toBeNull();
    expect(formatted.when).toBeNull();
    expect(formatted.href).toBe('/me/appointments');
  });

  it('surfaces the rejection reason as a note, on top of the /me/appointments link', () => {
    const formatted = formatNotification('APPOINTMENT_REJECTED', { reason: 'Fully booked' }, copy);

    expect(formatted.href).toBe('/me/appointments');
    expect(formatted.note).toBe(`${copy.notifications.reasonPrefix} Fully booked`);
  });

  it('links WAITLIST_MATCHED straight to the booking screen with a claim param', () => {
    const formatted = formatNotification(
      'WAITLIST_MATCHED',
      {
        businessId: 'biz-1',
        employeeId: 'emp-1',
        serviceId: 'svc-1',
        waitlistEntryId: 'wl-1',
        startsAt: '2026-08-25T06:00:00.000Z',
        timezone: 'Asia/Jerusalem',
        claimExpiresAt: '2026-08-25T07:00:00.000Z',
      },
      copy,
    );

    expect(formatted.href).toBe('/b/biz-1/e/emp-1/s/svc-1?date=2026-08-25&claim=wl-1');
    expect(formatted.note).toBe(`${copy.notifications.claimBy} 2026-08-25 10:00`);
  });

  it('omits the WAITLIST_MATCHED href when the payload is missing an id it needs', () => {
    const formatted = formatNotification('WAITLIST_MATCHED', { businessId: 'biz-1' }, copy);

    expect(formatted.href).toBeNull();
  });

  it('links both JOIN_REQUEST_* notifications to /businesses', () => {
    expect(formatNotification('JOIN_REQUEST_RECEIVED', {}, copy).href).toBe('/businesses');
    expect(formatNotification('JOIN_REQUEST_DECIDED', { decision: 'APPROVED' }, copy).href).toBe('/businesses');
  });

  it('shows the join-request outcome in the row itself, not only after a click', () => {
    const approved = formatNotification('JOIN_REQUEST_DECIDED', { decision: 'APPROVED' }, copy);
    expect(approved.status).toEqual({ label: copy.notifications.joinApproved, tone: 'success' });

    const rejected = formatNotification('JOIN_REQUEST_DECIDED', { decision: 'REJECTED' }, copy);
    expect(rejected.status).toEqual({ label: copy.notifications.joinRejected, tone: 'error' });
  });

  it('carries no status for any other notification type', () => {
    expect(formatNotification('JOIN_REQUEST_RECEIVED', {}, copy).status).toBeNull();
    expect(formatNotification('APPOINTMENT_CONFIRMED', {}, copy).status).toBeNull();
    expect(formatNotification('WAITLIST_MATCHED', {}, copy).status).toBeNull();
  });
});
