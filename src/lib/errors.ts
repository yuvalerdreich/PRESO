import { ZodError } from 'zod';

/**
 * Error taxonomy, the PostgreSQL → HTTP mapping, and the two boundary wrappers
 * (TECHNICAL_DESIGN.md §8).
 *
 * The division of labour §8.2 describes is literal: **the database raises, the route handler
 * translates.** Nothing between them interprets a SQLSTATE — `server/queries/*` and
 * `server/actions/*` let the PostgrestError propagate and the wrapper maps it once, in one
 * place, so the mapping table has exactly one implementation.
 */
export type AppErrorCode =
  | 'VALIDATION' // 400 — payload failed Zod
  | 'UNAUTHENTICATED' // 401 — no session
  | 'FORBIDDEN' // 403 — authenticated but not permitted (incl. suspended)
  | 'NOT_FOUND' // 404 — missing, or hidden by RLS (deliberately indistinguishable)
  | 'METHOD_NOT_ALLOWED' // 405 — the route exists, this verb doesn't (§12.58)
  | 'CONFLICT' // 409 — slot taken, duplicate join request, lost claim
  | 'GONE' // 410 — waitlist match expired
  | 'UNPROCESSABLE' // 422 — well-formed but not a legal state transition
  | 'RATE_LIMITED' // 429
  | 'UPSTREAM' // 502 — Resend, Storage
  | 'UNAVAILABLE' // 503 — a dependency this endpoint needs is unconfigured (§12.58)
  | 'INTERNAL'; // 500

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    readonly userMessage: string,
    readonly fields?: Record<string, string>,
    readonly cause?: unknown,
  ) {
    super(userMessage);
  }
}

/** The single error envelope every route handler returns (§5). */
export type ApiError = { error: { code: string; message: string; details?: unknown } };

/** §5.5 — server actions never throw across the boundary, they return this. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: { code: AppErrorCode; message: string; fields?: Record<string, string> };
    };

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  GONE: 410,
  UNPROCESSABLE: 422,
  RATE_LIMITED: 429,
  UPSTREAM: 502,
  UNAVAILABLE: 503,
  INTERNAL: 500,
};

export function statusFor(code: AppErrorCode): number {
  return STATUS_BY_CODE[code];
}

/**
 * §8.2's table, as a function. `details` carries `fields` when present so a client mutation's
 * `onError` can `setError` per field (§8.3); it never carries a SQLSTATE, a constraint name or
 * a stack trace — §8.4 forbids all three from reaching the browser.
 */
export function toHttp(error: AppError): { status: number; body: ApiError } {
  return {
    status: statusFor(error.code),
    body: {
      error: {
        code: error.code,
        message: error.userMessage,
        ...(error.fields ? { details: { fields: error.fields } } : {}),
      },
    },
  };
}

/**
 * Shape of what `@supabase/postgrest-js` throws back. Deliberately structural rather than an
 * import of `PostgrestError`: an RPC failure surfaces as `{ code, message, details, hint }`,
 * but a transport-level failure surfaces without `code`, and both reach this function.
 */
type PostgresErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

function isPostgresErrorLike(error: unknown): error is PostgresErrorLike {
  return typeof error === 'object' && error !== null && 'message' in error;
}

/**
 * §8.2, in the order the table lists. Two things about this mapping are load-bearing and easy
 * to get wrong:
 *
 * 1. **Only `23503` and `42501` are ever set explicitly by our RPCs** (`using errcode = …`).
 *    `slot_unavailable`, `illegal_transition`, `cancellation_window_closed` and `match_expired`
 *    are bare `raise exception`, which PL/pgSQL reports as SQLSTATE **`P0001`** — so they are
 *    distinguished by *message text*, not by code. Adding a fifth bare raise to a migration
 *    without adding it here silently degrades it to a 500.
 * 2. **`23P01` has no `RAISE` behind it at all.** It is the `appointments_no_overlap` exclusion
 *    constraint firing on INSERT — the mechanism, not a bug (§2, ARCHITECTURE.md §6.14). It is
 *    the reason booking is a route handler rather than a server action.
 */
export function fromPostgresError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (!isPostgresErrorLike(error)) {
    return new AppError('INTERNAL', 'Something went wrong on our side. Please try again.', undefined, error);
  }

  const code = error.code ?? '';
  const message = error.message ?? '';

  switch (code) {
    case '23P01':
      return new AppError(
        'CONFLICT',
        'That time was just booked by someone else. Here are the updated times.',
        undefined,
        error,
      );
    case '23505':
      // The only unique index a user can collide with by hand is `join_requests_one_open`
      // (0004_indexes.sql) — one open request per person per business.
      return new AppError(
        'CONFLICT',
        'You already have a pending request to this business.',
        undefined,
        error,
      );
    case '23503':
      // Our RPCs raise `not_found` with this errcode deliberately, so a genuine FK violation and
      // an explicit not_found are indistinguishable here. Both mean the same thing to a caller.
      return new AppError('NOT_FOUND', 'That item no longer exists.', undefined, error);
    case '23514':
      return new AppError(
        'VALIDATION',
        "That doesn't look right. Check the highlighted fields and try again.",
        undefined,
        error,
      );
    case '42501':
      return new AppError('FORBIDDEN', "You don't have permission to do that.", undefined, error);
    case 'PGRST301':
      return new AppError('UNAUTHENTICATED', 'Your session has expired. Please sign in again.', undefined, error);
  }

  // SQLSTATE P0001 — see note 1 above. Matched on the raised message.
  if (message.includes('slot_unavailable')) {
    return new AppError('UNPROCESSABLE', 'That time is no longer available.', undefined, error);
  }
  if (message.includes('cancellation_window_closed')) {
    return new AppError(
      'UNPROCESSABLE',
      'This appointment can no longer be cancelled online. Please contact the business directly.',
      undefined,
      error,
    );
  }
  if (message.includes('last_employee')) {
    return new AppError('UNPROCESSABLE', 'A business must keep at least one staff member.', undefined, error);
  }
  // §6.9 — removal is refused while future appointments exist, because each of those has to be
  // cancelled explicitly so its client gets notified. Not named in §8.2's table, but the same
  // family as `last_employee`: a legal-state refusal, not a malformed request.
  if (message.includes('employee_has_appointments')) {
    return new AppError(
      'UNPROCESSABLE',
      'This staff member still has upcoming appointments. Cancel them first, then remove them.',
      undefined,
      error,
    );
  }
  if (message.includes('match_expired')) {
    return new AppError('GONE', 'This offer has expired and the time was released.', undefined, error);
  }
  if (message.includes('illegal_transition')) {
    return new AppError(
      'UNPROCESSABLE',
      "That appointment can't be changed from its current status.",
      undefined,
      error,
    );
  }

  return new AppError('INTERNAL', 'Something went wrong on our side. Please try again.', undefined, error);
}

/** A Zod failure becomes a `VALIDATION` AppError whose `fields` drive per-field form errors. */
export function fromZodError(error: ZodError): AppError {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    // First message per field wins — a field with two failing rules shows one message.
    if (path && !(path in fields)) fields[path] = issue.message;
  }

  return new AppError('VALIDATION', 'Please correct the highlighted fields.', fields, error);
}

/** Everything that can reach a boundary, funnelled into one AppError. */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof ZodError) return fromZodError(error);
  return fromPostgresError(error);
}
