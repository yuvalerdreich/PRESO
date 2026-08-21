import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import type { Database } from '@/types/database.types';

/**
 * Session cookie refresh + coarse role gate (TECHNICAL_DESIGN.md §7.3), on Next.js 16's
 * `proxy.ts` — this project's design docs (and file tree) predate the framework renaming
 * `middleware.ts` to `proxy.ts`; see TECHNICAL_DESIGN.md §12.32 for the deviation note.
 *
 * `/me/*` requires a session; `/businesses/manage/*`, `/businesses`, `/onboarding`, `/join` require
 * `account_type = 'BUSINESS'` **or** `'ADMIN'` (an admin has every business-portal permission, plus
 * the admin console — §5); `/admin/*` requires `ADMIN` specifically. Fine-grained membership (does
 * this specific caller have an ACTIVE `employees` row for *this* business) is the job of
 * `server/guards.ts` inside each route group's layout, re-checked again by RLS — this file
 * is a redirect convenience only, never the security boundary.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Do not add code between createServerClient and getUser() — see Supabase's SSR guide.
  // getUser() revalidates the JWT against the Auth server rather than trusting the cookie
  // as-is; getSession() here would let a stale/forged cookie pass the gate.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const redirectToLogin = () => {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  };

  const requiresBusiness =
    pathname.startsWith('/businesses/manage') ||
    pathname === '/businesses' ||
    pathname === '/onboarding' ||
    pathname === '/join';

  if (pathname.startsWith('/me') || requiresBusiness || pathname.startsWith('/admin')) {
    if (!user) {
      return redirectToLogin();
    }
  }

  if (requiresBusiness || pathname.startsWith('/admin')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type')
      .eq('id', user!.id)
      .single();

    const allowedTypes = pathname.startsWith('/admin') ? ['ADMIN'] : ['BUSINESS', 'ADMIN'];
    if (!profile || !allowedTypes.includes(profile.account_type)) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Every route except static assets and image optimization — session refresh should
    // still run on public pages so a logged-in visitor's cookie doesn't silently expire.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
