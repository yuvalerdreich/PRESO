'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { reportInput } from '@/lib/validation/moderation';
import { action } from '@/server/action';
import { requireSession } from '@/server/guards';

/**
 * Moderation module — `createReport` (TECHNICAL_DESIGN.md §5.5, §4.5, §12.76).
 *
 * See the module-naming note in `identity.ts`: §5.5 names a Moderation module that §1's file tree
 * omits. Resolving a report is an admin action and lives in `admin.ts`, matching §5.5's own split.
 *
 * `reports.target_id` carries no foreign key because the target is polymorphic across businesses,
 * profiles and appointments — so nothing here can verify the target exists. That is the schema's
 * choice (§3.11), and the admin console resolves the target when reviewing. `targetType: 'GENERAL'`
 * (§12.76) is the exception: it carries no `targetId` at all, and is what the nav sidebar's
 * "נתקלת בבעיה? לחץ לדיווח" button files — `reportInput`'s `.refine()` and the DB's own CHECK both
 * enforce the pairing.
 */

export const createReport = action('createReport', reportInput, async (input) => {
  const profile = await requireSession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_profile_id: profile.id,
      target_type: input.targetType,
      target_id: input.targetId,
      description: input.description,
    })
    .select('id')
    .single();
  if (error) throw error;

  revalidatePath('/me');

  return { id: data.id };
});
