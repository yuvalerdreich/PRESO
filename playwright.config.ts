import { config as loadEnv } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * `next dev` always runs with NODE_ENV=development, so it never auto-loads
 * `.env.test.local` (Next only reads that suffix when NODE_ENV=test) — load
 * it explicitly, same as `tests/setup/int.ts` does for the integration
 * suite, and hand it to the webServer below. `npm run env:test` generates
 * this file from the running local Supabase stack; without it the webServer
 * boots with no Supabase URL/key and `proxy.ts` throws on the first request.
 */
const testEnv = loadEnv({ path: '.env.test.local' }).parsed ?? {};

const required = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;
const missing = required.filter((key) => !testEnv[key]);
if (missing.length > 0) {
  throw new Error(
    `E2E tests need ${missing.join(', ')} in .env.test.local.\n` +
      'Run `supabase start` then `npm run env:test`.',
  );
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // one local database; parallel specs would race fixtures
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    // The booking race (F19) is verified with two browser contexts; keep
    // video on failure so a lost race is reviewable after the fact.
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: testEnv,
  },
});
