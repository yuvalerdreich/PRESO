import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  AppError,
  fromPostgresError,
  fromZodError,
  statusFor,
  toAppError,
  toHttp,
  type AppErrorCode,
} from '@/lib/errors';

/**
 * TECHNICAL_DESIGN.md §8.2 is "the whole contract" between the database and the HTTP surface,
 * and it is entirely untyped — a migration can add a new `raise exception` and nothing in the
 * compiler notices that `fromPostgresError` still maps it to a 500. This suite is that check.
 *
 * The `P0001` group matters most: those four errors carry no distinguishing SQLSTATE at all
 * (PL/pgSQL's default for a bare `raise`), so they are matched on message text.
 */

describe('statusFor — §8.1 code → status', () => {
  const expected: Record<AppErrorCode, number> = {
    VALIDATION: 400,
    UNAUTHENTICATED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    GONE: 410,
    UNPROCESSABLE: 422,
    RATE_LIMITED: 429,
    UPSTREAM: 502,
    INTERNAL: 500,
  };

  for (const [code, status] of Object.entries(expected)) {
    it(`maps ${code} to ${status}`, () => {
      expect(statusFor(code as AppErrorCode)).toBe(status);
    });
  }
});

describe('fromPostgresError — §8.2, errors carrying an explicit SQLSTATE', () => {
  it('maps 23P01 (appointments_no_overlap) to CONFLICT — the booking race', () => {
    const error = fromPostgresError({
      code: '23P01',
      message: 'conflicting key value violates exclusion constraint "appointments_no_overlap"',
    });

    expect(error.code).toBe('CONFLICT');
    expect(error.userMessage).toMatch(/just booked by someone else/i);
  });

  it('maps 23505 to CONFLICT — the one open join request per business', () => {
    expect(fromPostgresError({ code: '23505', message: 'join_requests_one_open' }).code).toBe('CONFLICT');
  });

  it("maps 23503 to NOT_FOUND — our RPCs' explicit not_found uses this errcode", () => {
    expect(fromPostgresError({ code: '23503', message: 'not_found' }).code).toBe('NOT_FOUND');
  });

  it('maps 23514 (CHECK violation) to VALIDATION', () => {
    expect(fromPostgresError({ code: '23514', message: 'services_duration_check' }).code).toBe('VALIDATION');
  });

  it('maps 42501 to FORBIDDEN — both RLS denial and our insufficient_privilege raises', () => {
    expect(fromPostgresError({ code: '42501', message: 'insufficient_privilege' }).code).toBe('FORBIDDEN');
  });

  it('maps PGRST301 to UNAUTHENTICATED', () => {
    expect(fromPostgresError({ code: 'PGRST301', message: 'JWT expired' }).code).toBe('UNAUTHENTICATED');
  });
});

describe('fromPostgresError — §8.2, the P0001 group matched on message text', () => {
  // Every one of these reaches us as SQLSTATE P0001. The code column is intentionally identical
  // across the whole group; only `message` distinguishes them.
  const cases: Array<[string, AppErrorCode, number]> = [
    ['slot_unavailable', 'UNPROCESSABLE', 422],
    ['cancellation_window_closed', 'UNPROCESSABLE', 422],
    ['last_employee', 'UNPROCESSABLE', 422],
    ['illegal_transition', 'UNPROCESSABLE', 422],
    ['match_expired', 'GONE', 410],
  ];

  for (const [message, code, status] of cases) {
    it(`maps a bare raise '${message}' to ${code} (${status})`, () => {
      const error = fromPostgresError({ code: 'P0001', message });
      expect(error.code).toBe(code);
      expect(toHttp(error).status).toBe(status);
    });
  }

  it('does not confuse match_expired with slot_unavailable — 410 and 422 are different recoveries', () => {
    expect(fromPostgresError({ code: 'P0001', message: 'match_expired' }).code).toBe('GONE');
    expect(fromPostgresError({ code: 'P0001', message: 'slot_unavailable' }).code).toBe('UNPROCESSABLE');
  });
});

describe('fromPostgresError — fallthrough', () => {
  it('maps an unrecognised SQLSTATE to INTERNAL', () => {
    expect(fromPostgresError({ code: '40001', message: 'serialization failure' }).code).toBe('INTERNAL');
  });

  it('maps a non-Postgres throw to INTERNAL rather than leaking it', () => {
    const error = fromPostgresError(new TypeError('fetch failed'));
    expect(error.code).toBe('INTERNAL');
    expect(error.userMessage).toBe('Something went wrong on our side. Please try again.');
  });

  it('passes an AppError through untouched', () => {
    const original = new AppError('FORBIDDEN', 'nope');
    expect(fromPostgresError(original)).toBe(original);
  });
});

describe('toHttp — §8.4, what reaches the browser', () => {
  it('never leaks the SQLSTATE, the constraint name or the underlying message', () => {
    const { body } = toHttp(
      fromPostgresError({
        code: '23P01',
        message: 'conflicting key value violates exclusion constraint "appointments_no_overlap"',
        details: 'Key (employee_id, slot)=(…) conflicts with existing key',
      }),
    );

    const serialised = JSON.stringify(body);
    expect(serialised).not.toMatch(/23P01|appointments_no_overlap|exclusion constraint/);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('carries field errors in details so a form can setError per field', () => {
    const { status, body } = toHttp(new AppError('VALIDATION', 'Please correct the highlighted fields.', {
      price: 'Price cannot be negative',
    }));

    expect(status).toBe(400);
    expect(body.error.details).toEqual({ fields: { price: 'Price cannot be negative' } });
  });

  it('omits details entirely when there are no field errors', () => {
    expect(toHttp(new AppError('NOT_FOUND', 'That item no longer exists.')).body.error.details).toBeUndefined();
  });
});

describe('fromZodError — §9, client and server share the schema', () => {
  const schema = z.object({
    name: z.string().min(2, 'Service name must be at least 2 characters'),
    price: z.number().min(0, 'Price cannot be negative'),
  });

  it('turns issues into a VALIDATION error keyed by field path', () => {
    const parsed = schema.safeParse({ name: 'x', price: -1 });
    expect(parsed.success).toBe(false);

    const error = fromZodError(parsed.error!);
    expect(error.code).toBe('VALIDATION');
    expect(error.fields).toEqual({
      name: 'Service name must be at least 2 characters',
      price: 'Price cannot be negative',
    });
  });

  it('is reachable through toAppError, which is what the boundary wrappers call', () => {
    const parsed = schema.safeParse({ name: 'x', price: 0 });
    expect(toAppError(parsed.error!).code).toBe('VALIDATION');
  });
});
