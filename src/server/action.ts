import type { z } from 'zod';

import { toAppError, type ActionResult } from '@/lib/errors';
import { levelForCode, log } from '@/lib/logger';

/**
 * `withAction()` — the server-action boundary (TECHNICAL_DESIGN.md §8.3, §5.5).
 *
 * The contract is the inverse of `withErrorHandling()`: an action **never throws across the
 * boundary**. A thrown server action reaches the client as an opaque Next.js digest with the
 * message stripped in production, which destroys exactly the field-level errors a form needs —
 * so every action returns `ActionResult<T>` instead and the form reads `error.fields`.
 *
 * Guards (`server/guards.ts`) still throw; that is deliberate. The same guard serves a layout,
 * which catches and `redirect()`s, and an action, which catches here and returns `{ ok: false }`.
 */

/** Wrap an already-validated body of work. Use `action()` below when there is an input schema. */
export function withAction<TArgs extends unknown[], TResult>(
  name: string,
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<ActionResult<TResult>> {
  return async (...args: TArgs) => {
    try {
      return { ok: true, data: await fn(...args) };
    } catch (error) {
      const appError = toAppError(error);

      log[levelForCode(appError.code)]({
        event: `action.error.${appError.code.toLowerCase()}`,
        action: name,
        code: appError.code,
      });

      return {
        ok: false,
        error: {
          code: appError.code,
          message: appError.userMessage,
          ...(appError.fields ? { fields: appError.fields } : {}),
        },
      };
    }
  };
}

/**
 * The shape nearly every action uses: parse the same Zod schema the form's resolver used (§9 —
 * "client validation is UX, server validation is the boundary"), then run. A parse failure
 * becomes a `VALIDATION` result with per-field messages, never a throw.
 */
export function action<TSchema extends z.ZodType, TResult>(
  name: string,
  schema: TSchema,
  fn: (input: z.output<TSchema>) => Promise<TResult>,
): (input: z.input<TSchema>) => Promise<ActionResult<TResult>> {
  return withAction(name, async (input: z.input<TSchema>) => fn(schema.parse(input)));
}
