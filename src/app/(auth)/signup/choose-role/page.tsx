import { redirect } from 'next/navigation';

import { ChooseRoleForm } from '@/components/auth/choose-role-form';
import { getDefaultDestination } from '@/lib/auth/default-destination';
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

  // Already has a role, so there is nothing to choose here. BUSINESS still goes to the
  // onboarding wizard (it has a business to open); ADMIN goes to the home screen like every
  // other role — `(admin)/*` isn't built, so the old `/admin` bounce was a 404.
  if (profile.account_type === 'BUSINESS') redirect('/onboarding');
  if (profile.account_type === 'ADMIN') redirect(getDefaultDestination());

  return <ChooseRoleForm initialFullName={profile.full_name} />;
}
