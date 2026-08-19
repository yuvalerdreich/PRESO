import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getDefaultDestination } from '@/lib/auth/default-destination';
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

  if (type === 'recovery') {
    return NextResponse.redirect(new URL('/reset-password', origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('account_type, status')
    .eq('id', user!.id)
    .single();

  if (profile?.status === 'SUSPENDED') {
    await supabase.auth.signOut();
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('error', 'suspended');
    return NextResponse.redirect(loginUrl);
  }

  // Google OAuth can't collect the CLIENT/BUSINESS choice or a confirmed display name up
  // front the way email/password signup does (TECHNICAL_DESIGN.md §12.34) — every
  // Google-created profile lands as CLIENT with Google's own name. Detect a brand-new
  // account (created_at and last_sign_in_at land in the same auth event) and route it
  // through /signup/choose-role once, regardless of whether the button was clicked from
  // /login or /signup, instead of only when the signup page set `next` for it.
  const isFirstSignIn =
    !!user?.created_at &&
    !!user?.last_sign_in_at &&
    Math.abs(new Date(user.last_sign_in_at).getTime() - new Date(user.created_at).getTime()) < 5000;

  if (isFirstSignIn) {
    return NextResponse.redirect(new URL('/signup/choose-role', origin));
  }

  const destination = next ?? getDefaultDestination();
  return NextResponse.redirect(new URL(destination, origin));
}
