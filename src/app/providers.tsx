'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

import { createQueryClient } from '@/lib/query-client';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import type { Locale } from '@/lib/i18n/types';

/**
 * TanStack Query caches the interactive reads in this product: the availability request, and
 * (since discovery moved off client-side array filtering onto real pagination) the paginated
 * business search behind `GET /api/businesses` (`useBusinessSearch()`). Everything else is
 * fetched by a server component on navigation, so there is nothing else to keep in sync.
 *
 * The client is created in state rather than at module scope so that each
 * server render gets its own cache — a module-level client would be shared
 * across requests and leak one user's slots into another's response.
 */
export function Providers({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  const [queryClient] = useState(createQueryClient);

  return (
    <LanguageProvider initialLocale={initialLocale}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </LanguageProvider>
  );
}
