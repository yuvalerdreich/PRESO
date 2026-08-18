import type { ApiError } from '@/lib/errors';

/**
 * Read the message out of a failed `app/api/*` response.
 *
 * Every handler is wrapped in `withErrorHandling()` (TECHNICAL_DESIGN.md §8.3), so a non-2xx body
 * is always §8.4's `ApiError` envelope and `error.message` is already the user-facing text — the
 * SQLSTATE and the internal detail were stripped server-side. Client components show it verbatim
 * rather than mapping status codes a second time, which is what keeps "you can no longer cancel
 * this appointment, the business asks for 24 hours' notice" (a 422 from `cancel_appointment()`)
 * distinguishable from a generic failure.
 *
 * Returns `null` when the body isn't that envelope — a network failure or an HTML error page —
 * so the caller can fall back to its own generic copy.
 */
export async function readApiErrorMessage(response: Response): Promise<string | null> {
  const body = (await response.json().catch(() => null)) as ApiError | null;
  const message = body?.error?.message;
  return typeof message === 'string' && message.length > 0 ? message : null;
}
