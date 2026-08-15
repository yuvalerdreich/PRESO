/**
 * AppError taxonomy (TECHNICAL_DESIGN.md §8.1). The full SQLSTATE → HTTP mapping (§8.2) and
 * `toHttp()` belong to route handlers specifically and aren't built yet — this file scopes
 * to just the error class + codes, which is what server/guards.ts needs today. Add
 * `toHttp()` alongside the first route handler that needs it.
 */
export type AppErrorCode =
  | 'VALIDATION' // 400 — payload failed Zod
  | 'UNAUTHENTICATED' // 401 — no session
  | 'FORBIDDEN' // 403 — authenticated but not permitted (incl. suspended)
  | 'NOT_FOUND' // 404 — missing, or hidden by RLS (deliberately indistinguishable)
  | 'CONFLICT' // 409 — slot taken, duplicate join request, lost claim
  | 'GONE' // 410 — waitlist match expired
  | 'UNPROCESSABLE' // 422 — well-formed but not a legal state transition
  | 'RATE_LIMITED' // 429
  | 'UPSTREAM' // 502 — Resend, Storage
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
