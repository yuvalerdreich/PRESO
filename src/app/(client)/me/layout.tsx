import type { ReactNode } from 'react';

import { PublicHeader } from '@/components/common/public-header';

// TODO: gate — require an active session once session auth (server/guards.ts) exists.
// Reuses PublicHeader as a temporary shared shell until this portal gets its own chrome.
export default async function ClientMeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      {children}
    </div>
  );
}
