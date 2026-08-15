import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '@/types/database.types';

/**
 * Server Component & Server Action client (TECHNICAL_DESIGN.md §1). RLS-bound — reads and
 * writes run as whichever user's session cookie is present, never bypassing RLS.
 *
 * `setAll` is wrapped in try/catch because Server Components can read cookies but cannot
 * write them (`node_modules/next/dist/docs/.../cookies.md`: "Setting cookies is not
 * supported during Server Component rendering"). That's fine here — `proxy.ts` refreshes
 * the session cookie on every request regardless, so a render-time write attempt failing
 * silently doesn't lose the session. Server Actions *can* write cookies and hit this same
 * factory; there the try/catch is simply never triggered.
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
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called during a Server Component render — see comment above.
          }
        },
      },
    },
  );
}
