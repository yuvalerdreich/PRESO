import { describe, expect, it } from 'vitest';

import { availabilityRuleInput } from '@/lib/validation/availability';
import { createAppointmentInput, patchAppointmentInput } from '@/lib/validation/booking';
import { businessDetailsInput, setOperatingHoursInput } from '@/lib/validation/business';
import { availabilityQuery, businessSearchQuery, parseSearchParams } from '@/lib/validation/search';
import { serviceInput } from '@/lib/validation/service';
import { waitlistEntryInput } from '@/lib/validation/waitlist';

/**
 * TECHNICAL_DESIGN.md §9's cross-field rules — the ones a reader can't confirm by glancing at a
 * field list, and the ones the database's single-row CHECKs deliberately cannot express.
 */

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const UUID_C = '33333333-3333-4333-8333-333333333333';

const inDays = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

const validBusiness = {
  businessId: UUID_A,
  name: 'Studio Zohar',
  categoryId: UUID_B,
  address: 'Dizengoff 142, Tel Aviv',
  area: 'Tel Aviv',
  phone: '03-6001122',
};

describe('businessDetailsInput — §9.2', () => {
  it('defaults timezone, approval policy and the cancellation window', () => {
    const parsed = businessDetailsInput.parse(validBusiness);

    expect(parsed.timezone).toBe('Asia/Jerusalem');
    expect(parsed.approvalPolicy).toBe('AUTO');
    expect(parsed.cancellationWindowHours).toBe(24);
  });

  it('rejects a timezone that is not a real IANA zone (§12.3)', () => {
    expect(businessDetailsInput.safeParse({ ...validBusiness, timezone: 'Middle-earth/Shire' }).success).toBe(
      false,
    );
    expect(businessDetailsInput.safeParse({ ...validBusiness, timezone: 'Europe/Berlin' }).success).toBe(true);
  });

  it('holds the cancellation window to §12.2’s 0–168 hours', () => {
    expect(businessDetailsInput.safeParse({ ...validBusiness, cancellationWindowHours: 0 }).success).toBe(true);
    expect(businessDetailsInput.safeParse({ ...validBusiness, cancellationWindowHours: 168 }).success).toBe(true);
    expect(businessDetailsInput.safeParse({ ...validBusiness, cancellationWindowHours: 169 }).success).toBe(false);
  });
});

describe('setOperatingHoursInput — §9.3, the cross-row rule no CHECK can express', () => {
  const hours = (rows: Array<{ dayOfWeek: number; opensAt: string; closesAt: string }>) =>
    setOperatingHoursInput.safeParse({ businessId: UUID_A, rows });

  it('accepts split shifts on one day (§12.19)', () => {
    expect(
      hours([
        { dayOfWeek: 1, opensAt: '09:00', closesAt: '13:00' },
        { dayOfWeek: 1, opensAt: '16:00', closesAt: '20:00' },
      ]).success,
    ).toBe(true);
  });

  it('rejects two overlapping windows on the same day', () => {
    const result = hours([
      { dayOfWeek: 1, opensAt: '09:00', closesAt: '14:00' },
      { dayOfWeek: 1, opensAt: '13:00', closesAt: '20:00' },
    ]);

    expect(result.success).toBe(false);
    expect(result.error!.issues[0].message).toBe('Two windows on the same day overlap');
  });

  it('lets the same clock hours coexist on different days', () => {
    expect(
      hours([
        { dayOfWeek: 1, opensAt: '09:00', closesAt: '17:00' },
        { dayOfWeek: 2, opensAt: '09:00', closesAt: '17:00' },
      ]).success,
    ).toBe(true);
  });

  it('treats windows that merely touch as non-overlapping', () => {
    expect(
      hours([
        { dayOfWeek: 3, opensAt: '09:00', closesAt: '13:00' },
        { dayOfWeek: 3, opensAt: '13:00', closesAt: '17:00' },
      ]).success,
    ).toBe(true);
  });

  it('rejects a window that closes before it opens', () => {
    expect(hours([{ dayOfWeek: 1, opensAt: '17:00', closesAt: '09:00' }]).success).toBe(false);
  });
});

describe('availabilityRuleInput — §9.3, kind-dependent shape', () => {
  it('requires day and times for a WEEKLY_WINDOW and nothing else', () => {
    expect(
      availabilityRuleInput.safeParse({
        employeeId: UUID_A,
        kind: 'WEEKLY_WINDOW',
        dayOfWeek: 0,
        startsAt: '09:00',
        endsAt: '17:00',
      }).success,
    ).toBe(true);

    // Missing times — the DDL's kind-dependent CHECK would reject this as a bare 23514.
    expect(
      availabilityRuleInput.safeParse({ employeeId: UUID_A, kind: 'WEEKLY_WINDOW', dayOfWeek: 0 }).success,
    ).toBe(false);
  });

  it('requires an effective range for VACATION and BLOCK', () => {
    expect(
      availabilityRuleInput.safeParse({
        employeeId: UUID_A,
        kind: 'VACATION',
        effectiveFrom: inDays(10),
        effectiveTo: inDays(20),
      }).success,
    ).toBe(true);

    expect(availabilityRuleInput.safeParse({ employeeId: UUID_A, kind: 'BLOCK' }).success).toBe(false);
  });

  it('rejects an inverted effective range', () => {
    expect(
      availabilityRuleInput.safeParse({
        employeeId: UUID_A,
        kind: 'VACATION',
        effectiveFrom: inDays(20),
        effectiveTo: inDays(10),
      }).success,
    ).toBe(false);
  });

  it('rejects an unknown kind outright', () => {
    expect(availabilityRuleInput.safeParse({ employeeId: UUID_A, kind: 'SABBATICAL' }).success).toBe(false);
  });
});

describe('serviceInput — §9', () => {
  const base = { name: 'Haircut', price: 120, durationMinutes: 45 };

  it('defaults buffer to 0 and status to ACTIVE', () => {
    const parsed = serviceInput.parse(base);
    expect(parsed.bufferMinutes).toBe(0);
    expect(parsed.status).toBe('ACTIVE');
  });

  it('coerces the numbers a form submits as strings', () => {
    const parsed = serviceInput.parse({ name: 'Haircut', price: '120', durationMinutes: '45' });
    expect(parsed.price).toBe(120);
    expect(parsed.durationMinutes).toBe(45);
  });

  it('holds duration to the DDL’s 5–480 minutes', () => {
    expect(serviceInput.safeParse({ ...base, durationMinutes: 4 }).success).toBe(false);
    expect(serviceInput.safeParse({ ...base, durationMinutes: 481 }).success).toBe(false);
  });

  it('rejects a negative price', () => {
    expect(serviceInput.safeParse({ ...base, price: -1 }).success).toBe(false);
  });
});

describe('createAppointmentInput — §9.4', () => {
  it('accepts a future slot', () => {
    expect(
      createAppointmentInput.safeParse({ employeeId: UUID_A, serviceId: UUID_B, startsAt: inDays(1) }).success,
    ).toBe(true);
  });

  it('rejects a slot in the past', () => {
    expect(
      createAppointmentInput.safeParse({ employeeId: UUID_A, serviceId: UUID_B, startsAt: inDays(-1) }).success,
    ).toBe(false);
  });

  it('accepts clientProfileId — whether the caller may send it is the handler’s call, not the schema’s', () => {
    expect(
      createAppointmentInput.safeParse({
        employeeId: UUID_A,
        serviceId: UUID_B,
        startsAt: inDays(1),
        clientProfileId: UUID_C,
      }).success,
    ).toBe(true);
  });
});

describe('patchAppointmentInput — §5.4', () => {
  it('requires startsAt for reschedule and forbids it elsewhere being required', () => {
    expect(patchAppointmentInput.safeParse({ action: 'reschedule' }).success).toBe(false);
    expect(patchAppointmentInput.safeParse({ action: 'reschedule', startsAt: inDays(2) }).success).toBe(true);
    expect(patchAppointmentInput.safeParse({ action: 'cancel' }).success).toBe(true);
  });

  it('takes an optional reason only on reject', () => {
    expect(patchAppointmentInput.safeParse({ action: 'reject' }).success).toBe(true);
    expect(patchAppointmentInput.safeParse({ action: 'reject', reason: 'Fully booked' }).success).toBe(true);
  });

  it('rejects an unknown action', () => {
    expect(patchAppointmentInput.safeParse({ action: 'delete' }).success).toBe(false);
  });
});

describe('waitlistEntryInput — §9.4', () => {
  const base = { businessId: UUID_A, fromTs: inDays(1), toTs: inDays(10) };

  it('defaults employeeIds to empty, meaning any employee in the business', () => {
    expect(waitlistEntryInput.parse(base).employeeIds).toEqual([]);
  });

  it('caps the range at 60 days', () => {
    expect(waitlistEntryInput.safeParse({ ...base, toTs: inDays(59) }).success).toBe(true);
    expect(waitlistEntryInput.safeParse({ ...base, toTs: inDays(62) }).success).toBe(false);
  });

  it('caps employee targets at 20', () => {
    const tooMany = Array.from({ length: 21 }, () => UUID_B);
    expect(waitlistEntryInput.safeParse({ ...base, employeeIds: tooMany }).success).toBe(false);
  });

  it('rejects an inverted range', () => {
    expect(waitlistEntryInput.safeParse({ ...base, fromTs: inDays(10), toTs: inDays(1) }).success).toBe(false);
  });
});

describe('search query schemas — §5.2, §5.3', () => {
  it('applies §5.2’s paging and sort defaults', () => {
    const parsed = parseSearchParams(businessSearchQuery, new URLSearchParams('q=zohar'));

    expect(parsed).toMatchObject({ q: 'zohar', page: 1, pageSize: 20, sort: 'relevance' });
  });

  it('drops empty params so "?q=" means unfiltered rather than matching the empty string', () => {
    expect(parseSearchParams(businessSearchQuery, new URLSearchParams('q=&area=Haifa')).q).toBeUndefined();
  });

  it('rejects a price range whose maximum is below its minimum', () => {
    expect(businessSearchQuery.safeParse({ priceMin: 200, priceMax: 100 }).success).toBe(false);
    expect(businessSearchQuery.safeParse({ priceMin: 100, priceMax: 200 }).success).toBe(true);
  });

  it('caps the availability span at 62 days — the one public call that makes the DB compute', () => {
    const from = inDays(1);

    expect(
      availabilityQuery.safeParse({ employeeId: UUID_A, serviceId: UUID_B, from, to: inDays(60) }).success,
    ).toBe(true);
    expect(
      availabilityQuery.safeParse({ employeeId: UUID_A, serviceId: UUID_B, from, to: inDays(90) }).success,
    ).toBe(false);
  });

  it('rejects an availability range that ends before it starts', () => {
    expect(
      availabilityQuery.safeParse({ employeeId: UUID_A, serviceId: UUID_B, from: inDays(5), to: inDays(1) })
        .success,
    ).toBe(false);
  });
});
