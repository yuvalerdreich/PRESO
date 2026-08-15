import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { createClient } from '@/lib/supabase/route';

/**
 * GET /auth/callback (TECHNICAL_DESIGN.md §5.1) — Supabase session exchange for PKCE links
 * (password recovery, email confirmation, Google OAuth). Uses lib/supabase/route.ts's
 * client specifically, not the server-component variant, since a route handler can always
 * write response cookies.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const next = searchParams.get('next');

  if (!code) {
    return NextResponse.json(
      { error: { code: 'VALIDATION', message: 'Missing or invalid code.' } },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.json(
      { error: { code: 'VALIDATION', message: 'Missing or invalid code.' } },
      { status: 400 },
    );
  }

  const destination = type === 'recovery' ? '/reset-password' : (next ?? '/me');
  return NextResponse.redirect(new URL(destination, origin));
}
