'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { profileInput, profileSettingsInput } from '@/lib/validation/identity';
import { action } from '@/server/action';
import { requireSession } from '@/server/guards';

/**
 * Identity module (TECHNICAL_DESIGN.md §5.5's `updateProfile`).
 *
 * **Module-naming deviation:** §1's file tree lists six action modules — business, employee,
 * catalog, availability, notifications, admin — but §5.5's table assigns `updateProfile` to an
 * *Identity* module and `createReport` to a *Moderation* module that the tree never names. Rather
 * than fold them into an unrelated file, both exist as their own module and the discrepancy is
 * recorded in §12.
 *
 * Note what is absent: nothing here writes `account_type` or `status`.
 * `protect_profile_privileged_columns()` (0010_rls.sql) rejects both for a self-service caller
 * regardless of RLS, and the one legitimate CLIENT→BUSINESS upgrade goes through the
 * `claim_business_account_type()` RPC instead (§12.34).
 */

export const updateProfile = action('updateProfile', profileInput, async (input) => {
  const profile = await requireSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: input.fullName, phone: input.phone || null })
    .eq('id', profile.id);
  if (error) throw error;

  revalidatePath('/me/profile');

  return { id: profile.id };
});

/** §12.36's two additional self-editable columns, kept separate because they are a distinct form. */
export const updateProfileSettings = action('updateProfileSettings', profileSettingsInput, async (input) => {
  const profile = await requireSession();
  const supabase = await createClient();

  const { error } = await supabase
    .from('profiles')
    .update({
      location: input.location || null,
      date_of_birth: input.dateOfBirth || null,
    })
    .eq('id', profile.id);
  if (error) throw error;

  revalidatePath('/me/profile');

  return { id: profile.id };
});
