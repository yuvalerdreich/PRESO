import { redirect } from 'next/navigation';

import { AppError } from '@/lib/errors';
import { requireSession } from '@/server/guards';

export default async function BusinessLayout({ children }: LayoutProps<'/'>) {
  try {
    await requireSession();
  } catch (error) {
    if (error instanceof AppError) redirect('/login');
    throw error;
  }

  return <>{children}</>;
}
