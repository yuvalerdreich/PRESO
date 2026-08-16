import { NextResponse } from 'next/server';

import { toAppError, toHttp, type AppError } from '@/lib/errors';
import { levelForCode, log } from '@/lib/logger';

/**
 * `withErrorHandling()` — the route-handler boundary (TECHNICAL_DESIGN.md §8.3).
 *
 * Every handler in `app/api/*` is wrapped in this, and consequently **no handler contains a bare
 * `try/catch`**. Handlers throw `AppError` for the cases they detect themselves (401 from a
 * missing session, 422 from an unbookable pair) and simply let a PostgrestError propagate for the
 * cases the database detects (409 from the exclusion constraint); this maps both through §8.2 and
 * returns the one `ApiError` envelope.
 *
 * It lives here rather than in `lib/errors.ts` so that file stays free of `next/server` and can
 * be unit-tested in the jsdom project against §8.2's table.
 */

type Handler<TContext> = (request: Request, context: TContext) => Promise<Response>;

export function withErrorHandling<TContext>(
  route: string,
  handler: Handler<TContext>,
): Handler<TContext> {
  return async (request, context) => {
    const requestId = crypto.randomUUID();
    const startedAt = Date.now();

    try {
      const response = await handler(request, context);
      // §8.5: echoed so a client-reported failure can be correlated with a server log line.
      response.headers.set('x-request-id', requestId);
      return response;
    } catch (error) {
      const appError = toAppError(error);
      const { status, body } = toHttp(appError);

      log[levelForCode(appError.code)]({
        event: `api.error.${appError.code.toLowerCase()}`,
        requestId,
        route,
        code: appError.code,
        sqlstate: sqlstateOf(appError),
        status,
        durationMs: Date.now() - startedAt,
      });

      return NextResponse.json(body, { status, headers: { 'x-request-id': requestId } });
    }
  };
}

/** The originating SQLSTATE, kept for logs only — §8.4 forbids it from reaching the browser. */
function sqlstateOf(error: AppError): string | undefined {
  const cause = error.cause;
  if (typeof cause === 'object' && cause !== null && 'code' in cause) {
    const code = (cause as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return undefined;
}

/** `201`/`200` bodies go out through here so every handler shapes success the same way. */
export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/** `DELETE /api/waitlist/[id]` answers `204`, which must not carry a body. */
export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
