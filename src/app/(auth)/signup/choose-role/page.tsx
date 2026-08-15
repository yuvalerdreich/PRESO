import { redirect } from 'next/navigation';

import { ChooseRoleForm } from '@/components/auth/choose-role-form';
import { AppError } from '@/lib/errors';
import { requireSession } from '@/server/guards';

/**
 * Reached after Google sign-in from /signup (TECHNICAL_DESIGN.md §12.34) — offers the
 * CLIENT/BUSINESS choice email/password signup collects up front but OAuth cannot.
 */
export default async function ChooseRolePage() {
  let profile;
  try {
    profile = await requireSession();
  } catch (error) {
    if (error instanceof AppError) redirect('/login');
    throw error;
  }

  if (profile.account_type === 'BUSINESS') redirect('/onboarding');
  if (profile.account_type === 'ADMIN') redirect('/admin');

  return <ChooseRoleForm />;
}
