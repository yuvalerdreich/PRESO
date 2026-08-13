import type { ReactNode } from 'react';

import { PublicHeader } from '@/components/common/public-header';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      {children}
    </div>
  );
}
