import { redirect } from 'next/navigation';

import { AccountSidebar } from '@/components/common/account-sidebar';
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

  const supabase = await createClient();
  const { data: employee } = await supabase
    .from('employees')
    .select('id')
    .eq('profile_id', profile.id)
    .eq('status', 'ACTIVE')
    .limit(1)
    .maybeSingle();

  if (!employee) redirect('/onboarding');

  return (
    <div className="min-h-screen lg:flex">
      <AccountSidebar accountType={profile.account_type} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
