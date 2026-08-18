import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

/**
 * Does this profile hold an ACTIVE `employees` row anywhere? (TECHNICAL_DESIGN.md §12.41)
 *
 * That row — a *position*, never a person-record — is what makes a BUSINESS account able to use
 * the dashboard at all: §6.8 rule 5 says one exists only after the account opens a business or a
 * founder approves its join request. Three callers need the same answer (the OAuth callback, the
 * login form, and the dashboard gate itself), so the query lives here rather than three times over.
 *
 * Client-agnostic on purpose: `employees_select` is `using (true)` (`0010_rls.sql`), so the browser
 * client can ask this as safely as the server one.
 */
export async function hasActiveEmployment(
  supabase: SupabaseClient<Database>,
  profileId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', profileId)
    .eq('status', 'ACTIVE')
    .limit(1)
    .maybeSingle();

  return Boolean(data);
}
