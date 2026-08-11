'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { createQueryClient } from '@/lib/query-client';

/**
 * TanStack Query caches exactly one read in this product: the availability
 * request (TECHNICAL_DESIGN.md §7.1). Everything else is fetched by a server
 * component on navigation, so there is nothing else to keep in sync.
 *
 * The client is created in state rather than at module scope so that each
 * server render gets its own cache — a module-level client would be shared
 * across requests and leak one user's slots into another's response.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
