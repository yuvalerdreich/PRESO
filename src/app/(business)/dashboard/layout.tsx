import { redirect } from 'next/navigation';

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

  return <>{children}</>;
}
