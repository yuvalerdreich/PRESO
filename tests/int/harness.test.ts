import { createClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

/**
 * Proves the integration runner can reach the local Supabase stack with both
 * key kinds. From F2 onward these two clients are the whole point: the anon
 * client is bound by RLS, the service-role client is not, and every policy is
 * asserted by showing that the same query returns different rows to each.
 */
describe('integration test harness', () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  it('reaches the local stack with the anon key', async () => {
    const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { error } = await anon.auth.getSession();

    expect(error).toBeNull();
  });

  it('reaches the local stack with the service-role key, and the anon key cannot', async () => {
    const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    // The Auth Admin API is reachable only with the service-role key. Asserting
    // both halves proves the two clients are genuinely different privileges,
    // not just two names for the same access.
    const asAdmin = await admin.auth.admin.listUsers();
    expect(asAdmin.error).toBeNull();

    const asAnon = await anon.auth.admin.listUsers();
    expect(asAnon.error).not.toBeNull();
  });

  it('refuses to point at anything but the local stack', () => {
    expect(url).toMatch(/127\.0\.0\.1|localhost/);
  });
});
