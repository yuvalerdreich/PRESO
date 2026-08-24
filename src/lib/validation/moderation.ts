import { z } from 'zod';

import { uuid } from '@/lib/validation/common';

/**
 * Reports (TECHNICAL_DESIGN.md §9.4, §4.5, §12.76). `reports.target_id` carries no foreign key —
 * the target is polymorphic across businesses, profiles and appointments — so `targetType` is
 * what tells the admin console which table to resolve it against. `GENERAL` is the fourth,
 * targetless member (§12.76): "I hit a problem with the site," not "I hit a problem with X" — the
 * nav sidebar's "נתקלת בבעיה? לחץ לדיווח" button always files one of these. The DB's
 * `reports_target_id_null_iff_general` CHECK is the actual boundary; this `.refine()` mirrors it
 * so the form can show a field-level error instead of a raw 23514 from the server.
 */

export const reportInput = z
  .object({
    targetType: z.enum(['BUSINESS', 'PROFILE', 'APPOINTMENT', 'GENERAL'], {
      message: 'Choose what you are reporting',
    }),
    targetId: uuid.nullable(),
    description: z
      .string()
      .trim()
      .min(10, 'Describe the issue in at least 10 characters')
      .max(1000, 'Descriptions are limited to 1000 characters'),
  })
  .refine((input) => (input.targetType === 'GENERAL') === (input.targetId === null), {
    message: 'A general report has no target; any other report needs one',
    path: ['targetId'],
  });
export type ReportInput = z.infer<typeof reportInput>;

export const resolveReportInput = z.object({
  id: uuid,
  outcome: z.enum(['RESOLVED', 'DISMISSED'], { message: 'Choose an outcome' }),
  note: z.string().trim().max(1000).optional(),
});
export type ResolveReportInput = z.infer<typeof resolveReportInput>;
