import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '@/types/database.types';

/**
 * Route Handler client (TECHNICAL_DESIGN.md §1). RLS-bound, same as lib/supabase/server.ts,
 * but without the try/catch around `setAll` — Route Handlers can always write response
 * cookies (unlike Server Component renders), so a failure here is a real error, not an
 * expected no-op.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        },
      },
    },
  );
}
