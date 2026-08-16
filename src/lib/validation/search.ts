import { z } from 'zod';

import { MILLISECONDS_PER_DAY, isoDateTime, timeHHmm, uuid } from '@/lib/validation/common';

/**
 * Query-string schemas for the two public read endpoints (TECHNICAL_DESIGN.md §5.2, §5.3, §9.4).
 *
 * These parse `URLSearchParams`, so every field arrives as a string or not at all — hence
 * `z.coerce` on the numbers and `.optional()` rather than `.nullable()` throughout.
 */

const searchText = z.string().trim().max(100, 'Search text is too long').optional();

/** §5.3 caps `to − from` at 62 days; §6.6 caps the next-available horizon at 14. */
export const MAX_AVAILABILITY_SPAN_DAYS = 62;
export const MAX_NEXT_AVAILABLE_HORIZON_DAYS = 14;

/**
 * `GET /api/businesses` (§5.2). `q` matches the business name **and the owner's full name**
 * (§12.22) — a client can find a place by the person they know rather than the trading name.
 */
export const businessSearchQuery = z
  .object({
    q: searchText,
    /** A category **slug**, not an id — ids are per-environment `gen_random_uuid()`. */
    category: z.string().trim().max(60).optional(),
    area: searchText,
    serviceQ: searchText,
    priceMin: z.coerce.number().min(0, 'Price cannot be negative').optional(),
    priceMax: z.coerce.number().min(0, 'Price cannot be negative').optional(),
    date: z.iso.date().optional(),
    hourFrom: timeHHmm.optional(),
    hourTo: timeHHmm.optional(),
    sort: z.enum(['relevance', 'nextAvailable']).default('relevance'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine((query) => query.priceMax === undefined || query.priceMin === undefined || query.priceMax >= query.priceMin, {
    message: 'Maximum price must be at least the minimum',
    path: ['priceMax'],
  })
  .refine((query) => query.hourTo === undefined || query.hourFrom === undefined || query.hourTo > query.hourFrom, {
    message: 'The latest hour must be after the earliest',
    path: ['hourTo'],
  });
export type BusinessSearchQuery = z.infer<typeof businessSearchQuery>;

/**
 * `GET /api/availability` (§5.3). The span cap is the reason this is validated at all: the
 * endpoint is a thin caller over `get_available_slots()`, which computes rather than reads, so
 * an unbounded range is the one way a public caller could make the database do real work.
 */
export const availabilityQuery = z
  .object({
    employeeId: uuid,
    serviceId: uuid,
    from: isoDateTime,
    to: isoDateTime,
  })
  .refine((query) => Date.parse(query.to) > Date.parse(query.from), {
    message: 'The end of the range must be after its start',
    path: ['to'],
  })
  .refine(
    (query) =>
      Date.parse(query.to) - Date.parse(query.from) <= MAX_AVAILABILITY_SPAN_DAYS * MILLISECONDS_PER_DAY,
    { message: 'Requested date range is too large', path: ['to'] },
  );
export type AvailabilityQuery = z.infer<typeof availabilityQuery>;

/** `GET /api/employees/[id]/services` (§5.3). */
export const employeeServicesQuery = z.object({
  activeOnly: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
});
export type EmployeeServicesQuery = z.infer<typeof employeeServicesQuery>;

/** Parse a `URLSearchParams` with one of the schemas above, dropping absent keys. */
export function parseSearchParams<TSchema extends z.ZodType>(
  schema: TSchema,
  params: URLSearchParams,
): z.output<TSchema> {
  const raw: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    // An empty query param ("?q=") means "not filtered", not "match the empty string".
    if (value !== '') raw[key] = value;
  }
  return schema.parse(raw);
}
