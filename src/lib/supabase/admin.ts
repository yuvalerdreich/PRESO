import { createClient as createSupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database.types';

/**
 * Service-role client (TECHNICAL_DESIGN.md §1) — BYPASSES ROW LEVEL SECURITY entirely.
 *
 * Import ONLY from app/api/webhooks/* and app/api/cron/*, endpoints called by machines
 * (the Supabase notifications webhook, Vercel Cron), never by users. Enforced by the
 * `no-restricted-imports` rule in eslint.config.mjs — a stray import elsewhere silently
 * removes RLS, the second enforcement layer (ARCHITECTURE.md §3.3), and no test would
 * notice, since the query would simply succeed.
 *
 * No cookie handling: the service role authenticates via the key itself, not a user
 * session, so this uses the plain @supabase/supabase-js client rather than @supabase/ssr.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
