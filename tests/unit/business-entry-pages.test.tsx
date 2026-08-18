import { describe, expect, it, vi } from 'vitest';

// `redirect()` throws in Next's real implementation; the routes are one call and nothing else, so
// a spy is all this needs.
const redirect = vi.fn();
vi.mock('next/navigation', () => ({ redirect: (url: string) => redirect(url) }));

import JoinRoute from '@/app/(business)/join/page';
import OnboardingRoute from '@/app/(business)/onboarding/page';

// The real onboarding/join screens are still unbuilt (CLAUDE.md §8, punch-list #3). Until they
// exist both routes forward to `/businesses` rather than rendering a placeholder that dead-ends —
// TECHNICAL_DESIGN.md §12.41. Replace these assertions with rendering tests when the screens land.
describe('business-entry pages', () => {
  it('forwards /onboarding to the built businesses screen', async () => {
    await OnboardingRoute();
    expect(redirect).toHaveBeenCalledWith('/businesses');
  });

  it('forwards /join to the built businesses screen', async () => {
    await JoinRoute();
    expect(redirect).toHaveBeenCalledWith('/businesses');
  });
});
