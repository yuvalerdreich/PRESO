import type { NextRequest } from 'next/server';

import { AppError } from '@/lib/errors';
import { ok, withErrorHandling } from '@/lib/http';
import { uuid } from '@/lib/validation/common';
import { employeeServicesQuery, parseSearchParams } from '@/lib/validation/search';
import { getEmployeeById, listServicesForEmployee } from '@/server/queries/discovery';

/**
 * `GET /api/employees/[id]/services` (TECHNICAL_DESIGN.md §5.3).
 *
 * This endpoint is how PDF §8 rule 8 is enforced — "a client sees only the services the selected
 * employee offers". It is keyed by **employee**, and there is deliberately no business-wide
 * variant to filter down from: the client never receives another employee's services, so nothing
 * can be filtered client-side by accident (§12.9, CLAUDE.md §6).
 */
export const GET = withErrorHandling(
  'GET /api/employees/[id]/services',
  async (request: Request, context: RouteContext<'/api/employees/[id]/services'>) => {
    const { id } = await context.params;

    const parsed = uuid.safeParse(id);
    if (!parsed.success) throw new AppError('NOT_FOUND', 'That staff member no longer exists.');

    const employee = await getEmployeeById(parsed.data);
    if (!employee) throw new AppError('NOT_FOUND', 'That staff member no longer exists.');

    const { activeOnly } = parseSearchParams(
      employeeServicesQuery,
      (request as NextRequest).nextUrl.searchParams,
    );

    return ok({ items: await listServicesForEmployee(parsed.data, { activeOnly }) });
  },
);
