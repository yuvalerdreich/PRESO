import { z } from 'zod';

import { uuid } from '@/lib/validation/common';

/**
 * Reports (TECHNICAL_DESIGN.md §9.4, §4.5). `reports.target_id` carries no foreign key — the
 * target is polymorphic across businesses, profiles and appointments — so `targetType` is what
 * tells the admin console which table to resolve it against.
 */

export const reportInput = z.object({
  targetType: z.enum(['BUSINESS', 'PROFILE', 'APPOINTMENT'], { message: 'Choose what you are reporting' }),
  targetId: uuid,
  description: z
    .string()
    .trim()
    .min(10, 'Describe the issue in at least 10 characters')
    .max(1000, 'Descriptions are limited to 1000 characters'),
});
export type ReportInput = z.infer<typeof reportInput>;

export const resolveReportInput = z.object({
  id: uuid,
  outcome: z.enum(['RESOLVED', 'DISMISSED'], { message: 'Choose an outcome' }),
  note: z.string().trim().max(1000).optional(),
});
export type ResolveReportInput = z.infer<typeof resolveReportInput>;
