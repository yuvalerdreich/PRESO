import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/types/database.types';

/**
 * Browser client (TECHNICAL_DESIGN.md §1) — sign-in, Realtime subscriptions, photo URLs.
 * Cookie sync with the server is automatic; RLS-bound, same as the server/route clients.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
