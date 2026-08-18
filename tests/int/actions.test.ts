import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { Database } from '@/types/database.types';

/**
 * `server/actions/*` against the real local stack.
 *
 * Two things are stubbed and nothing else. `lib/supabase/server.ts` is swapped for a genuine
 * client, as in the query tests. `next/cache`'s `revalidatePath` is stubbed because it throws
 * outside a request scope — the actions' *effect on the database* is what these assert, and
 * cache invalidation has no observable behaviour in a test runner anyway.
 *
 * The recurring assertion across this file is §8.3's contract: an action **never throws**. Every
 * failure path below is checked as `{ ok: false, error: { code } }`, because a thrown action
 * reaches the client as an opaque digest with the field errors stripped, which is exactly what
 * `withAction()` exists to prevent.
 */
const state = vi.hoisted(() => ({ client: null as unknown as SupabaseClient<Database> }));

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.client }));
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));

const { createBusiness, setOperatingHours, updateBusinessDetails } = await import(
  '@/server/actions/business'
);
const { decideJoinRequest, removeEmployee, sendJoinRequest, setEmployeeStatus } = await import(
  '@/server/actions/employee'
);
const { deleteService, upsertService } = await import('@/server/actions/catalog');
const { deleteAvailabilityRule, upsertAvailabilityRule } = await import('@/server/actions/availability');
const { updateProfile } = await import('@/server/actions/identity');
const { createReport } = await import('@/server/actions/moderation');
const { suspendBusiness, suspendUser } = await import('@/server/actions/admin');

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const STUDIO_ZOHAR = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001';
const EMPLOYEE_ZOHAR = 'e0000000-0000-4000-8000-000000000001';
const EMPLOYEE_MIYA = 'e0000000-0000-4000-8000-000000000002';
const SERVICE_ZOHAR_HAIRCUT = '50000000-0000-4000-8000-000000000002';

const admin = createSupabaseClient<Database>(URL_, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function signIn(email: string): Promise<SupabaseClient<Database>> {
  const client = createSupabaseClient<Database>(URL_, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: 'demo-password' });
  if (error) throw new Error(`${email} could not sign in: ${error.message}`);
  return client;
}

/** A throwaway BUSINESS account, so tests that open a business don't collide with the seed. */
async function createTestUser(accountType: 'BUSINESS' | 'CLIENT'): Promise<{ id: string; email: string }> {
  const email = `actions-${crypto.randomUUID()}@test.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'demo-password',
    email_confirm: true,
    user_metadata: { full_name: 'Actions Tester', account_type: accountType },
  });
  if (error) throw error;
  return { id: data.user!.id, email };
}

const createdUserIds: string[] = [];

/**
 * Everything this suite writes to `audit_log` is removed afterwards, and the high-water mark is
 * how: audit rows are written by triggers as `security definer`, so there is no id to collect at
 * the call site, and their `actor_profile_id` is often a *seeded* user (the founder approving a
 * request) rather than one of the accounts created here.
 *
 * This is not tidiness. `supabase/tests/0005_triggers.test.sql` asserts counts like "approving a
 * join request writes **one** audit_log row", and pgTAP's `begin … rollback` cannot undo rows
 * that were already committed — so leftovers here make that suite fail with `have: 3, want: 1`,
 * pointing at a trigger that is working perfectly.
 */
const suiteStartedAt = new Date().toISOString();

/**
 * Full teardown, in dependency order. The integration project shares one database and does not
 * reset it between runs, so anything left behind becomes another test's surprise — a business
 * created here shows up in the next run's `searchBusinesses()` results.
 *
 * Order is forced by the schema rather than chosen: `businesses.owner_profile_id` and
 * `employees.profile_id` are both `on delete restrict`, so deleting the auth user first fails
 * silently and orphans the whole tree.
 */
afterAll(async () => {
  for (const id of createdUserIds) {
    const { data: owned } = await admin.from('businesses').select('id').eq('owner_profile_id', id);
    const businessIds = (owned ?? []).map((row) => row.id);

    if (businessIds.length > 0) {
      const { data: employees } = await admin.from('employees').select('id').in('business_id', businessIds);
      const employeeIds = (employees ?? []).map((row) => row.id);

      if (employeeIds.length > 0) {
        await admin.from('appointments').delete().in('employee_id', employeeIds);
        await admin.from('services').delete().in('employee_id', employeeIds);
      }
      await admin.from('employees').delete().in('business_id', businessIds);
      await admin.from('business_hours').delete().in('business_id', businessIds);
      await admin.from('businesses').delete().in('id', businessIds);
    }

    await admin.from('employees').delete().eq('profile_id', id);
    await admin.from('join_requests').delete().eq('profile_id', id);
    await admin.from('reports').delete().eq('reporter_profile_id', id);
    await admin.auth.admin.deleteUser(id);
  }

  await admin.from('notifications').delete().gte('created_at', suiteStartedAt);
  await admin.from('audit_log').delete().gte('created_at', suiteStartedAt);
});

describe('createBusiness — §6.8 rule 3, one transaction', () => {
  it('creates the business and its first employee together', async () => {
    const user = await createTestUser('BUSINESS');
    createdUserIds.push(user.id);
    state.client = await signIn(user.email);

    const { data: category } = await admin.from('categories').select('id').eq('slug', 'beauty').single();

    const result = await createBusiness({
      name: 'Action Test Salon',
      categoryId: category!.id,
      address: '10 Action Street',
      area: 'Tel Aviv',
      phone: '03-1112222',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { data: employees } = await admin
      .from('employees')
      .select('profile_id, status')
      .eq('business_id', result.data.businessId);

    expect(employees).toHaveLength(1);
    expect(employees![0]).toMatchObject({ profile_id: user.id, status: 'ACTIVE' });
  });

  it('refuses a CLIENT account without throwing, returning FORBIDDEN', async () => {
    state.client = await signIn('client@demo.local');
    const { data: category } = await admin.from('categories').select('id').eq('slug', 'beauty').single();

    const result = await createBusiness({
      name: 'Client Salon',
      categoryId: category!.id,
      address: '11 Action Street',
      area: 'Tel Aviv',
      phone: '03-1112223',
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  });

  it('returns per-field VALIDATION errors rather than throwing on a bad payload', async () => {
    state.client = await signIn('zohar@demo.local');

    const result = await createBusiness({
      name: 'x', // below the 2-char minimum
      categoryId: 'not-a-uuid',
      address: '10 Action Street',
      area: 'Tel Aviv',
      phone: 'nope',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('VALIDATION');
    expect(Object.keys(result.error.fields ?? {}).sort()).toEqual(['categoryId', 'name', 'phone']);
  });
});

describe('business details and hours — §12.1 lets any ACTIVE employee edit', () => {
  it('allows a non-founder employee to edit business details', async () => {
    state.client = await signIn('miya@demo.local');

    const result = await updateBusinessDetails({
      businessId: STUDIO_ZOHAR,
      name: 'Studio Zohar - מספרת זוהר',
      description: 'Edited by staff, which §12.1 permits.',
      categoryId: (await admin.from('businesses').select('category_id').eq('id', STUDIO_ZOHAR).single()).data!
        .category_id,
      address: 'רחוב דיזנגוף 142, תל אביב',
      area: 'תל אביב',
      phone: '03-6001122',
      cancellationWindowHours: 24,
    });

    expect(result.ok).toBe(true);
  });

  it('refuses an employee of a different business', async () => {
    state.client = await signIn('idan@demo.local');

    const result = await updateBusinessDetails({
      businessId: STUDIO_ZOHAR,
      name: 'Hijacked',
      categoryId: (await admin.from('businesses').select('category_id').eq('id', STUDIO_ZOHAR).single()).data!
        .category_id,
      address: 'רחוב דיזנגוף 142, תל אביב',
      area: 'תל אביב',
      phone: '03-6001122',
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    const { data } = await admin.from('businesses').select('name').eq('id', STUDIO_ZOHAR).single();
    expect(data!.name).not.toBe('Hijacked');
  });

  it('rejects overlapping windows on the same day before touching the database', async () => {
    state.client = await signIn('zohar@demo.local');

    const result = await setOperatingHours({
      businessId: STUDIO_ZOHAR,
      rows: [
        { dayOfWeek: 1, opensAt: '09:00', closesAt: '14:00' },
        { dayOfWeek: 1, opensAt: '13:00', closesAt: '20:00' },
      ],
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
    // The replace-all delete must not have run.
    const { count } = await admin
      .from('business_hours')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', STUDIO_ZOHAR);
    expect(count).toBe(6);
  });
});

describe('services — owned by the acting employee (§3.8, §4.3)', () => {
  it('creates a service against the caller’s own employees row, not a supplied id', async () => {
    state.client = await signIn('miya@demo.local');

    const result = await upsertService({ name: 'Action Test Service', price: 99, durationMinutes: 30 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { data } = await admin.from('services').select('employee_id').eq('id', result.data.id).single();
    expect(data!.employee_id).toBe(EMPLOYEE_MIYA);

    await admin.from('services').delete().eq('id', result.data.id);
  });

  it('cannot edit another employee’s service', async () => {
    state.client = await signIn('miya@demo.local');

    const result = await upsertService({
      id: SERVICE_ZOHAR_HAIRCUT, // belongs to Zohar
      name: 'Stolen',
      price: 1,
      durationMinutes: 5,
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    const { data } = await admin.from('services').select('name').eq('id', SERVICE_ZOHAR_HAIRCUT).single();
    expect(data!.name).not.toBe('Stolen');
  });

  it('hard-deletes a service with no appointments', async () => {
    state.client = await signIn('miya@demo.local');

    const created = await upsertService({ name: 'Ephemeral', price: 10, durationMinutes: 15 });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const result = await deleteService({ id: created.data.id });
    expect(result).toMatchObject({ ok: true, data: { softDeleted: false } });

    const { count } = await admin
      .from('services')
      .select('id', { count: 'exact', head: true })
      .eq('id', created.data.id);
    expect(count).toBe(0);
  });

  it('soft-deletes a service that an appointment references, so history survives (§4.3)', async () => {
    state.client = await signIn('zohar@demo.local');

    const result = await deleteService({ id: SERVICE_ZOHAR_HAIRCUT });
    expect(result).toMatchObject({ ok: true, data: { softDeleted: true } });

    const { data } = await admin.from('services').select('status').eq('id', SERVICE_ZOHAR_HAIRCUT).single();
    expect(data!.status).toBe('INACTIVE');

    await admin.from('services').update({ status: 'ACTIVE' }).eq('id', SERVICE_ZOHAR_HAIRCUT);
  });
});

describe('availability rules — kind-dependent shape and own-employee scoping', () => {
  it('creates a BLOCK and removes it again', async () => {
    state.client = await signIn('zohar@demo.local');

    const from = new Date(Date.now() + 40 * 86_400_000).toISOString();
    const to = new Date(Date.now() + 41 * 86_400_000).toISOString();

    const created = await upsertAvailabilityRule({
      employeeId: EMPLOYEE_ZOHAR,
      kind: 'BLOCK',
      effectiveFrom: from,
      effectiveTo: to,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const { data } = await admin
      .from('employee_availability_rules')
      .select('kind, day_of_week, starts_at')
      .eq('id', created.data.id)
      .single();
    // A BLOCK carries a range and no times — §3.7's kind-dependent CHECK.
    expect(data).toMatchObject({ kind: 'BLOCK', day_of_week: null, starts_at: null });

    expect((await deleteAvailabilityRule({ id: created.data.id })).ok).toBe(true);
  });

  it('refuses to set another employee’s working hours', async () => {
    state.client = await signIn('miya@demo.local');

    const result = await upsertAvailabilityRule({
      employeeId: EMPLOYEE_ZOHAR,
      kind: 'WEEKLY_WINDOW',
      dayOfWeek: 3,
      startsAt: '06:00',
      endsAt: '07:00',
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
  });
});

describe('join requests and roster — the founder’s exclusive powers (§6.8 rule 6)', () => {
  it('runs the full request → approve → remove cycle', async () => {
    const joiner = await createTestUser('BUSINESS');
    createdUserIds.push(joiner.id);

    state.client = await signIn(joiner.email);
    const requested = await sendJoinRequest({ businessId: STUDIO_ZOHAR });
    expect(requested.ok).toBe(true);
    if (!requested.ok) return;

    // §6.8 rule 5 — no employees row exists until approval.
    const { count: beforeApproval } = await admin
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', joiner.id);
    expect(beforeApproval).toBe(0);

    // A non-founder employee cannot decide it.
    state.client = await signIn('miya@demo.local');
    expect(await decideJoinRequest({ id: requested.data.id, decision: 'APPROVED' })).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN' },
    });

    state.client = await signIn('zohar@demo.local');
    const decided = await decideJoinRequest({
      id: requested.data.id,
      decision: 'APPROVED',
      positionTitle: 'Junior Stylist',
    });
    expect(decided).toMatchObject({ ok: true, data: { status: 'APPROVED' } });

    const { data: employee } = await admin
      .from('employees')
      .select('id, status, position_title')
      .eq('profile_id', joiner.id)
      .single();
    expect(employee).toMatchObject({ status: 'ACTIVE', position_title: 'Junior Stylist' });

    // With no appointment history the position is genuinely deleted, not retired.
    const removed = await removeEmployee({ employeeId: employee!.id });
    expect(removed).toMatchObject({ ok: true, data: { retired: false } });
  });

  it('reports a duplicate open request as CONFLICT, via the partial unique index', async () => {
    const joiner = await createTestUser('BUSINESS');
    createdUserIds.push(joiner.id);
    state.client = await signIn(joiner.email);

    expect((await sendJoinRequest({ businessId: STUDIO_ZOHAR })).ok).toBe(true);
    expect(await sendJoinRequest({ businessId: STUDIO_ZOHAR })).toMatchObject({
      ok: false,
      error: { code: 'CONFLICT' },
    });

    await admin.from('join_requests').delete().eq('profile_id', joiner.id);
  });

  it('refuses to remove the last employee (§8.2’s last_employee → 422)', async () => {
    const owner = await createTestUser('BUSINESS');
    createdUserIds.push(owner.id);
    state.client = await signIn(owner.email);

    const { data: category } = await admin.from('categories').select('id').eq('slug', 'lessons').single();
    const created = await createBusiness({
      name: 'Solo Studio',
      categoryId: category!.id,
      address: '1 Solo Lane',
      area: 'Haifa',
      phone: '04-1234567',
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const { data: employee } = await admin
      .from('employees')
      .select('id')
      .eq('business_id', created.data.businessId)
      .single();

    expect(await removeEmployee({ employeeId: employee!.id })).toMatchObject({
      ok: false,
      error: { code: 'UNPROCESSABLE' },
    });
  });

  it('lets the founder deactivate a colleague, and refuses a non-founder', async () => {
    state.client = await signIn('miya@demo.local');
    expect(await setEmployeeStatus({ employeeId: EMPLOYEE_ZOHAR, status: 'INACTIVE' })).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN' },
    });

    state.client = await signIn('zohar@demo.local');
    expect((await setEmployeeStatus({ employeeId: EMPLOYEE_MIYA, status: 'INACTIVE' })).ok).toBe(true);
    expect((await setEmployeeStatus({ employeeId: EMPLOYEE_MIYA, status: 'ACTIVE' })).ok).toBe(true);
  });
});

describe('identity, moderation and admin', () => {
  it('updates the caller’s own profile', async () => {
    const user = await createTestUser('CLIENT');
    createdUserIds.push(user.id);
    state.client = await signIn(user.email);

    expect((await updateProfile({ fullName: 'Renamed Tester', phone: '052-9998888' })).ok).toBe(true);

    const { data } = await admin.from('profiles').select('full_name').eq('id', user.id).single();
    expect(data!.full_name).toBe('Renamed Tester');
  });

  it('files a report', async () => {
    state.client = await signIn('client@demo.local');

    const result = await createReport({
      targetType: 'BUSINESS',
      targetId: STUDIO_ZOHAR,
      description: 'Testing the moderation action end to end.',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    await admin.from('reports').delete().eq('id', result.data.id);
  });

  it('refuses admin actions to a non-admin without throwing', async () => {
    state.client = await signIn('zohar@demo.local');

    expect(await suspendBusiness({ id: STUDIO_ZOHAR, suspended: true })).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN' },
    });
    expect(await suspendUser({ id: 'd0000000-0000-4000-8000-000000000006', suspended: true })).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN' },
    });

    const { data } = await admin.from('businesses').select('status').eq('id', STUDIO_ZOHAR).single();
    expect(data!.status).toBe('ACTIVE');
  });
});

describe('suspension writes an audit row from the trigger, not the action (§8.5)', () => {
  let adminUser: { id: string; email: string };

  beforeAll(async () => {
    adminUser = await createTestUser('BUSINESS');
    createdUserIds.push(adminUser.id);
    // ADMIN is provisioned by SQL only (§6.8 rules 1–2) — never by any action or route.
    await admin.from('profiles').update({ account_type: 'ADMIN' }).eq('id', adminUser.id);
  });

  it('suspends a business and leaves an audit_log entry behind', async () => {
    state.client = await signIn(adminUser.email);

    expect((await suspendBusiness({ id: STUDIO_ZOHAR, suspended: true })).ok).toBe(true);

    const { data: audit } = await admin
      .from('audit_log')
      .select('action, entity_id')
      .eq('entity', 'businesses')
      .eq('entity_id', STUDIO_ZOHAR)
      .order('created_at', { ascending: false })
      .limit(1);
    expect(audit![0].action).toBe('business.suspend');

    expect((await suspendBusiness({ id: STUDIO_ZOHAR, suspended: false })).ok).toBe(true);
  });

  it('refuses to let an admin suspend themselves', async () => {
    state.client = await signIn(adminUser.email);

    expect(await suspendUser({ id: adminUser.id, suspended: true })).toMatchObject({
      ok: false,
      error: { code: 'UNPROCESSABLE' },
    });
  });

  it('reports a suspension that matched no row instead of claiming success', async () => {
    state.client = await signIn(adminUser.email);

    // The regression this guards: an UPDATE that RLS filters to zero rows is not an error, so
    // before 0019 an admin's suspendBusiness returned { ok: true } and changed nothing.
    expect(await suspendBusiness({ id: '00000000-0000-4000-8000-00000000dead', suspended: true })).toMatchObject(
      { ok: false, error: { code: 'NOT_FOUND' } },
    );
    expect(await suspendUser({ id: '00000000-0000-4000-8000-00000000dead', suspended: true })).toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
  });
});
