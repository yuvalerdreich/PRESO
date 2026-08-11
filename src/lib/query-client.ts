import { QueryClient } from '@tanstack/react-query';

/**
 * Defaults from TECHNICAL_DESIGN.md §7.1.
 *
 * `staleTime: 30s` is a deliberate trade-off: long enough that paging between
 * dates feels instant, short enough that a stale slot list is rare — and when
 * it *is* stale, the 409 path corrects it. Correctness never depends on
 * freshness, because a slot is advisory and the exclusion constraint decides.
 *
 * 4xx is never retried: a 409 means someone else took the slot, and retrying
 * it would hammer the endpoint with a request that cannot start succeeding.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          const status = (error as { status?: number }).status;
          if (typeof status === 'number' && status < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: { retry: false },
    },
  });
}
