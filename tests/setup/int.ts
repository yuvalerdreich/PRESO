import { config } from 'dotenv';

/**
 * Integration tests always run against the LOCAL Supabase stack, never the
 * cloud project — they create and destroy fixture rows. `.env.test.local`
 * holds the local stack's keys (printed by `supabase start`) and is loaded
 * ahead of `.env.local` so a developer's cloud credentials can never win.
 */
config({ path: '.env.test.local' });

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Integration tests need ${missing.join(', ')} in .env.test.local.\n` +
      'Run `supabase start` and copy the printed keys, or `npm run env:test`.',
  );
}

if (!/127\.0\.0\.1|localhost/.test(process.env.NEXT_PUBLIC_SUPABASE_URL!)) {
  throw new Error(
    `Refusing to run integration tests against ${process.env.NEXT_PUBLIC_SUPABASE_URL}. ` +
      'They mutate data and must only ever point at the local stack.',
  );
}
