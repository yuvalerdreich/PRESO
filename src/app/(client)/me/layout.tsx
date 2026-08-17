import { redirect } from 'next/navigation';

import { AccountSidebar } from '@/components/common/account-sidebar';
import { AppError } from '@/lib/errors';
import { requireSession } from '@/server/guards';

export default async function MeLayout({ children }: LayoutProps<'/me'>) {
  let profile;
  try {
    profile = await requireSession();
  } catch (error) {
    if (error instanceof AppError) redirect('/login');
    throw error;
  }

  return (
    <div className="min-h-screen lg:flex">
      <AccountSidebar accountType={profile.account_type} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
