import type { ReactNode } from 'react';

// TODO: gate — require the caller to have an ACTIVE employees row once session auth exists.
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
