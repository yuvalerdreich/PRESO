import { redirect } from 'next/navigation';

import { hasActiveEmployment } from '@/lib/auth/active-employment';
import { AppError } from '@/lib/errors';
import { requireSession } from '@/server/guards';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardLayout({ children }: LayoutProps<'/dashboard'>) {
  let profile;
  try {
    profile = await requireSession();
  } catch (error) {
    if (error instanceof AppError) redirect('/login');
    throw error;
  }

  // No ACTIVE employees row means there is no business to manage yet. The target tree sends that
  // case to `/onboarding`, but that screen is unbuilt (punch-list #3) and was a dead end —
  // `/businesses` is the built screen offering the same two ways out (§12.41).
  const supabase = await createClient();
  if (!(await hasActiveEmployment(supabase, profile.id))) redirect('/businesses');

  return <>{children}</>;
}
