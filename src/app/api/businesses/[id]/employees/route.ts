import { AppError } from '@/lib/errors';
import { methodNotAllowed, ok, withErrorHandling } from '@/lib/http';
import { uuid } from '@/lib/validation/common';
import { getBusinessProfile, listBusinessEmployeeItems } from '@/server/queries/discovery';

/**
 * `GET /api/businesses/[id]/employees` (TECHNICAL_DESIGN.md §5.3) — the public roster.
 *
 * `serviceCount` is the field that matters: §12.10 makes an employee with zero services
 * *selectable but unbookable*, and PDF §8 rule 4 requires the picker to render even for a
 * one-person business. Without the count the UI can only show an unexplained empty service list.
 */
export const GET = withErrorHandling(
  'GET /api/businesses/[id]/employees',
  async (_request: Request, context: RouteContext<'/api/businesses/[id]/employees'>) => {
    const { id } = await context.params;

    const parsed = uuid.safeParse(id);
    if (!parsed.success) throw new AppError('NOT_FOUND', 'That business no longer exists.');

    // Checked explicitly so an unknown business is a 404 rather than an empty roster, which the
    // client would otherwise render as "this business has no staff".
    const business = await getBusinessProfile(parsed.data);
    if (!business) throw new AppError('NOT_FOUND', 'That business no longer exists.');

    return ok({ items: await listBusinessEmployeeItems(parsed.data) });
  },
);

/** §12.58 — every other verb answers the envelope with an `Allow`, not Next's empty 405. */
const notAllowed = methodNotAllowed('GET');
export { notAllowed as POST, notAllowed as PUT, notAllowed as PATCH, notAllowed as DELETE };
