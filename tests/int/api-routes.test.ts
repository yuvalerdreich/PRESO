import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { Database } from '@/types/database.types';

/**
 * The `app/api/*` route tree against the real local stack.
 *
 * Handlers are invoked directly rather than over HTTP — there is no server to run — but they are
 * the real exported functions, so `withErrorHandling`, the Zod parsing and the §8.2 status
 * mapping all execute. Only `lib/supabase/route.ts` is stubbed, because it reads the session from
 * request cookies that do not exist in a test runner.
 *
 * The assertion this file exists for is the `409`: two clients booking the same slot, where the
 * loser's `COMMIT` raises `23P01` from `appointments_no_overlap`. That is the single behaviour
 * the whole architecture is built around (§2), and until now nothing had ever exercised it from
 * the caller's side.
 */
const state = vi.hoisted(() => ({ client: null as unknown as SupabaseClient<Database> }));

vi.mock('@/lib/supabase/route', () => ({ createClient: async () => state.client }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => state.client }));

const { GET: getBusinesses } = await import('@/app/api/businesses/route');
const { GET: getEmployees } = await import('@/app/api/businesses/[id]/employees/route');
const { GET: getServices } = await import('@/app/api/employees/[id]/services/route');
const { GET: getAvailability } = await import('@/app/api/availability/route');
const { POST: postAppointment } = await import('@/app/api/appointments/route');
const { PATCH: patchAppointment } = await import('@/app/api/appointments/[id]/route');
const { POST: postWaitlist } = await import('@/app/api/waitlist/route');
const { DELETE: deleteWaitlist } = await import('@/app/api/waitlist/[id]/route');

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const STUDIO_ZOHAR = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001';
const GLOW_CLINIC = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1002';
const APEX_FITNESS = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1000';
const EMPLOYEE_ZOHAR = 'e0000000-0000-4000-8000-000000000001';
const EMPLOYEE_MIYA = 'e0000000-0000-4000-8000-000000000002';
const EMPLOYEE_DANA = 'e0000000-0000-4000-8000-000000000003';
const SERVICE_ZOHAR_HAIRCUT = '50000000-0000-4000-8000-000000000002';
const SERVICE_MIYA_HAIRCUT = '50000000-0000-4000-8000-000000000005';
const SERVICE_GLOW_FACIAL = '50000000-0000-4000-8000-000000000007';

const admin = createSupabaseClient<Database>(URL_, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const createdUserIds: string[] = [];
const createdAppointmentIds: string[] = [];

/**
 * Notifications and audit rows written by this suite are removed by timestamp, not by owner.
 *
 * Booking, cancelling and rescheduling all fire notification triggers, and those notify the
 * *business* — seeded accounts this suite must not delete — so filtering by the users created
 * here would miss most of them. `supabase/tests/0005_triggers.test.sql` asserts counts like
 * "exactly one APPOINTMENT_RESCHEDULED notice exists", and pgTAP's `begin … rollback` cannot undo
 * already-committed rows, so leftovers make that suite fail while pointing at a healthy trigger.
 */
const suiteStartedAt = new Date().toISOString();

function anonClient(): SupabaseClient<Database> {
  return createSupabaseClient<Database>(URL_, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email: string): Promise<SupabaseClient<Database>> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email, password: 'demo-password' });
  if (error) throw new Error(`${email} could not sign in: ${error.message}`);
  return client;
}

async function createClientUser(): Promise<{ id: string; email: string }> {
  const email = `routes-${crypto.randomUUID()}@test.local`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'demo-password',
    email_confirm: true,
    user_metadata: { full_name: 'Route Tester', account_type: 'CLIENT' },
  });
  if (error) throw error;
  createdUserIds.push(data.user!.id);
  return { id: data.user!.id, email };
}

const req = (url: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest(`http://localhost${url}`, init);
const jsonReq = (url: string, body: unknown, method = 'POST') =>
  req(url, { method, body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
const params = <T,>(value: T) => ({ params: Promise.resolve(value) });

/**
 * The first genuinely free slot for a pair, straight from the availability engine.
 *
 * `minHoursAhead` matters more than it looks: the seeded businesses have a
 * `cancellation_window_hours` of 24–48, and a client may not cancel online inside it (§12.2). The
 * earliest available slot is often *today*, so any test that books and then cancels has to reach
 * past that window or it gets a perfectly correct 422.
 */
async function firstFreeSlot(employeeId: string, serviceId: string, minHoursAhead = 0): Promise<string> {
  const from = new Date(Date.now() + minHoursAhead * 3_600_000);
  const to = new Date(from.getTime() + 20 * 86_400_000);

  const { data, error } = await admin.rpc('get_available_slots', {
    p_employee_id: employeeId,
    p_service_id: serviceId,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) throw error;
  if (!data?.length) throw new Error('the seed produced no bookable slots');

  return data[0].starts_at;
}

/**
 * Insert an appointment directly, bypassing availability.
 *
 * Only for fixtures that need a slot the engine would never offer — specifically one *inside* the
 * cancellation window, which cannot be reached by booking normally at a predictable time. The
 * exclusion constraint still applies, so this cannot manufacture a double booking.
 */
async function seedAppointment(
  clientProfileId: string,
  employeeId: string,
  serviceId: string,
  startsAt: Date,
  durationMinutes: number,
): Promise<string> {
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000);

  const { data, error } = await admin
    .from('appointments')
    .insert({
      client_profile_id: clientProfileId,
      employee_id: employeeId,
      service_id: serviceId,
      slot: `[${startsAt.toISOString()},${endsAt.toISOString()})`,
      status: 'CONFIRMED',
      created_by: clientProfileId,
    })
    .select('id')
    .single();
  if (error) throw error;

  createdAppointmentIds.push(data.id);
  return data.id;
}

afterAll(async () => {
  if (createdAppointmentIds.length > 0) {
    await admin.from('appointments').delete().in('id', createdAppointmentIds);
  }
  for (const id of createdUserIds) {
    await admin.from('appointments').delete().eq('client_profile_id', id);
    await admin.from('waitlist_entries').delete().eq('client_profile_id', id);
    await admin.auth.admin.deleteUser(id);
  }

  await admin.from('notifications').delete().gte('created_at', suiteStartedAt);
  await admin.from('audit_log').delete().gte('created_at', suiteStartedAt);
});

describe('GET /api/businesses — §5.2', () => {
  beforeAll(() => {
    state.client = anonClient();
  });

  it('returns a paged envelope to an anonymous caller', async () => {
    const response = await getBusinesses(req('/api/businesses'), undefined);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({ page: 1, pageSize: 20 });
    expect(body.items.map((item: { id: string }) => item.id)).toEqual(
      expect.arrayContaining([STUDIO_ZOHAR, GLOW_CLINIC, APEX_FITNESS]),
    );
  });

  it('carries a price range and a category per item', async () => {
    const body = await (await getBusinesses(req('/api/businesses?q=Zohar'), undefined)).json();

    expect(body.items).toHaveLength(1);
    expect(body.items[0].category).toMatchObject({ slug: 'beauty' });
    expect(body.items[0].priceRange).toMatchObject({ min: 70, max: 380 });
    // nextAvailableAt is only computed when asked for — §12.8's cost warning.
    expect(body.items[0].nextAvailableAt).toBeNull();
  });

  it('filters by service name and price through the services join', async () => {
    const cheap = await (await getBusinesses(req('/api/businesses?priceMax=100'), undefined)).json();
    expect(cheap.items.map((i: { id: string }) => i.id)).toContain(STUDIO_ZOHAR);

    const none = await (await getBusinesses(req('/api/businesses?serviceQ=skydiving'), undefined)).json();
    expect(none).toMatchObject({ items: [], total: 0 });
  });

  it('computes nextAvailableAt and sorts by it when asked', async () => {
    const body = await (
      await getBusinesses(req('/api/businesses?sort=nextAvailable'), undefined)
    ).json();

    const times = body.items.map((item: { nextAvailableAt: string }) => item.nextAvailableAt);
    expect(times.every((t: string | null) => t !== null)).toBe(true);
    expect([...times].sort()).toEqual(times);
  });

  it('rejects an invalid query with 400 rather than ignoring it', async () => {
    const response = await getBusinesses(req('/api/businesses?priceMin=200&priceMax=100'), undefined);

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe('VALIDATION');
  });

  it('echoes a request id header for correlation (§8.5)', async () => {
    const response = await getBusinesses(req('/api/businesses'), undefined);
    expect(response.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('GET roster and services — §5.3', () => {
  beforeAll(() => {
    state.client = anonClient();
  });

  it('returns the roster with a service count (§12.10)', async () => {
    const response = await getEmployees(req('/x'), params({ id: STUDIO_ZOHAR }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.items).toHaveLength(2);
    expect(body.items.every((i: { serviceCount: number }) => i.serviceCount === 3)).toBe(true);
  });

  it('404s an unknown business instead of returning an empty roster', async () => {
    const response = await getEmployees(req('/x'), params({ id: '00000000-0000-4000-8000-00000000dead' }));
    expect(response.status).toBe(404);
  });

  it('returns only the selected employee’s services (PDF §8 rule 8)', async () => {
    const zohar = await (await getServices(req('/x'), params({ id: EMPLOYEE_ZOHAR }))).json();
    const miya = await (await getServices(req('/x'), params({ id: EMPLOYEE_MIYA }))).json();

    expect(zohar.items).toHaveLength(3);
    expect(miya.items).toHaveLength(3);
    const zoharIds = new Set(zohar.items.map((s: { id: string }) => s.id));
    expect(miya.items.some((s: { id: string }) => zoharIds.has(s.id))).toBe(false);
  });
});

describe('GET /api/availability — §5.3', () => {
  beforeAll(() => {
    state.client = anonClient();
  });

  const window_ = () => {
    const from = new Date();
    const to = new Date(from.getTime() + 7 * 86_400_000);
    return `from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
  };

  it('returns slots packed at duration + buffer, with the business timezone', async () => {
    const response = await getAvailability(
      req(`/api/availability?employeeId=${EMPLOYEE_ZOHAR}&serviceId=${SERVICE_ZOHAR_HAIRCUT}&${window_()}`),
      undefined,
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.timezone).toBe('Asia/Jerusalem');
    expect(body.slots.length).toBeGreaterThan(0);
    expect(body.slots[0]).toHaveProperty('dateISO');
    expect(body.slots[0]).toHaveProperty('time');
  });

  it('answers 422 for a service that employee does not offer, not an empty list', async () => {
    const response = await getAvailability(
      req(`/api/availability?employeeId=${EMPLOYEE_MIYA}&serviceId=${SERVICE_ZOHAR_HAIRCUT}&${window_()}`),
      undefined,
    );

    expect(response.status).toBe(422);
    expect((await response.json()).error.code).toBe('UNPROCESSABLE');
  });

  it('answers 404 for an unknown employee', async () => {
    const response = await getAvailability(
      req(
        `/api/availability?employeeId=00000000-0000-4000-8000-00000000dead&serviceId=${SERVICE_ZOHAR_HAIRCUT}&${window_()}`,
      ),
      undefined,
    );
    expect(response.status).toBe(404);
  });

  it('rejects a range wider than 62 days (§5.3’s cap)', async () => {
    const from = new Date();
    const to = new Date(from.getTime() + 90 * 86_400_000);
    const response = await getAvailability(
      req(
        `/api/availability?employeeId=${EMPLOYEE_ZOHAR}&serviceId=${SERVICE_ZOHAR_HAIRCUT}&from=${from.toISOString()}&to=${to.toISOString()}`,
      ),
      undefined,
    );

    expect(response.status).toBe(400);
  });
});

describe('POST /api/appointments — §5.4, the critical contract', () => {
  it('rejects an anonymous caller with 401', async () => {
    state.client = anonClient();

    const response = await postAppointment(
      jsonReq('/api/appointments', {
        employeeId: EMPLOYEE_ZOHAR,
        serviceId: SERVICE_ZOHAR_HAIRCUT,
        startsAt: await firstFreeSlot(EMPLOYEE_ZOHAR, SERVICE_ZOHAR_HAIRCUT),
      }),
      undefined,
    );

    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe('UNAUTHENTICATED');
  });

  it('creates a CONFIRMED appointment at an AUTO-approval business', async () => {
    const user = await createClientUser();
    state.client = await signIn(user.email);

    const startsAt = await firstFreeSlot(EMPLOYEE_ZOHAR, SERVICE_ZOHAR_HAIRCUT);
    const response = await postAppointment(
      jsonReq('/api/appointments', {
        employeeId: EMPLOYEE_ZOHAR,
        serviceId: SERVICE_ZOHAR_HAIRCUT,
        startsAt,
      }),
      undefined,
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    createdAppointmentIds.push(body.id);

    expect(body).toMatchObject({ status: 'CONFIRMED', employeeId: EMPLOYEE_ZOHAR });
    expect(new Date(body.startsAt).toISOString()).toBe(new Date(startsAt).toISOString());
    // endsAt comes from the stored tstzrange, so it reflects the service's real duration.
    expect(new Date(body.endsAt).getTime() - new Date(body.startsAt).getTime()).toBe(30 * 60_000);
  });

  it('creates a PENDING appointment at a MANUAL-approval business', async () => {
    const user = await createClientUser();
    state.client = await signIn(user.email);

    const response = await postAppointment(
      jsonReq('/api/appointments', {
        employeeId: EMPLOYEE_DANA,
        serviceId: SERVICE_GLOW_FACIAL,
        startsAt: await firstFreeSlot(EMPLOYEE_DANA, SERVICE_GLOW_FACIAL),
      }),
      undefined,
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    createdAppointmentIds.push(body.id);
    // Glow Clinic is approval_policy = MANUAL, and this comes from the RPC's returned row.
    expect(body.status).toBe('PENDING');
  });

  /**
   * A slot taken *earlier* answers 422, not 409 — worth pinning, because it is easy to assume
   * every double-booking is a 409.
   *
   * `book_appointment()` re-runs `get_available_slots()` inside its transaction (§6.2), so once
   * the winning row is committed the slot is simply no longer on offer and the RPC raises
   * `slot_unavailable`. The exclusion constraint never gets a chance to fire. Both codes tell the
   * client the same thing — re-fetch availability — which is why §7.2 lists the same invalidation
   * for both.
   */
  it('answers 422 when the slot was taken earlier, before the constraint can be reached', async () => {
    const first = await createClientUser();
    const second = await createClientUser();
    const startsAt = await firstFreeSlot(EMPLOYEE_MIYA, SERVICE_MIYA_HAIRCUT);

    const book = () =>
      postAppointment(
        jsonReq('/api/appointments', {
          employeeId: EMPLOYEE_MIYA,
          serviceId: SERVICE_MIYA_HAIRCUT,
          startsAt,
        }),
        undefined,
      );

    state.client = await signIn(first.email);
    const winner = await book();
    expect(winner.status).toBe(201);
    createdAppointmentIds.push((await winner.json()).id);

    state.client = await signIn(second.email);
    const loser = await book();

    expect(loser.status).toBe(422);
    expect((await loser.json()).error.message).toMatch(/no longer available/i);
  });

  /**
   * The reason this whole file exists (§2, §6.9, drawio page 3).
   *
   * Two clients, one slot, genuinely concurrent — both pass the availability re-check before
   * either commits, so the decision falls to `appointments_no_overlap` and the loser's `COMMIT`
   * raises `23P01`. This is the one case an application-level check could never handle, because
   * Vercel invocations are separate processes with no shared memory.
   *
   * The invariant asserted is "never two winners". Which code the loser sees depends on the
   * interleaving — 409 if the constraint caught it, 422 if the winner committed early enough for
   * the re-check to notice — and pinning one of them would make this test flaky for a reason that
   * has nothing to do with correctness.
   */
  it('never double-books under genuine concurrency', async () => {
    const first = await createClientUser();
    const second = await createClientUser();
    const startsAt = await firstFreeSlot(EMPLOYEE_ZOHAR, SERVICE_ZOHAR_HAIRCUT);

    const clientA = await signIn(first.email);
    const clientB = await signIn(second.email);

    const book = async (client: SupabaseClient<Database>) => {
      state.client = client;
      return postAppointment(
        jsonReq('/api/appointments', {
          employeeId: EMPLOYEE_ZOHAR,
          serviceId: SERVICE_ZOHAR_HAIRCUT,
          startsAt,
        }),
        undefined,
      );
    };

    const [a, b] = await Promise.all([book(clientA), book(clientB)]);
    const statuses = [a.status, b.status].sort();

    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.some((status) => status === 409 || status === 422)).toBe(true);

    for (const response of [a, b]) {
      const body = await response.json();
      if (response.status === 201) {
        createdAppointmentIds.push(body.id);
      } else {
        // §8.4 — no SQLSTATE or constraint name ever reaches the browser.
        expect(JSON.stringify(body)).not.toMatch(/23P01|appointments_no_overlap|slot_unavailable/);
      }
    }

    // The database is the authority: exactly one live appointment holds that slot.
    const { count } = await admin
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('employee_id', EMPLOYEE_ZOHAR)
      .neq('status', 'CANCELLED')
      .overlaps('slot', `[${new Date(startsAt).toISOString()},${new Date(startsAt).toISOString()}]`);
    expect(count).toBe(1);
  });

  it('answers 422 for a time that is not a bookable slot', async () => {
    const user = await createClientUser();
    state.client = await signIn(user.email);

    // 03:00 local — inside no working window at any of the seeded businesses.
    const startsAt = new Date();
    startsAt.setUTCDate(startsAt.getUTCDate() + 3);
    startsAt.setUTCHours(0, 0, 0, 0);

    const response = await postAppointment(
      jsonReq('/api/appointments', {
        employeeId: EMPLOYEE_ZOHAR,
        serviceId: SERVICE_ZOHAR_HAIRCUT,
        startsAt: startsAt.toISOString(),
      }),
      undefined,
    );

    expect(response.status).toBe(422);
    expect((await response.json()).error.message).toMatch(/no longer available/i);
  });

  it('answers 400 with per-field details for a malformed body', async () => {
    const user = await createClientUser();
    state.client = await signIn(user.email);

    const response = await postAppointment(
      jsonReq('/api/appointments', { employeeId: 'nope', serviceId: 'nope', startsAt: 'yesterday' }),
      undefined,
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('VALIDATION');
    expect(Object.keys(body.error.details.fields)).toEqual(
      expect.arrayContaining(['employeeId', 'serviceId', 'startsAt']),
    );
  });

  it('answers 403 when a non-staff caller books on behalf of someone else (§12.5)', async () => {
    const caller = await createClientUser();
    const victim = await createClientUser();
    state.client = await signIn(caller.email);

    const response = await postAppointment(
      jsonReq('/api/appointments', {
        employeeId: EMPLOYEE_ZOHAR,
        serviceId: SERVICE_ZOHAR_HAIRCUT,
        startsAt: await firstFreeSlot(EMPLOYEE_ZOHAR, SERVICE_ZOHAR_HAIRCUT),
        clientProfileId: victim.id,
      }),
      undefined,
    );

    expect(response.status).toBe(403);
    expect((await response.json()).error.message).toMatch(/only staff/i);
  });

  it('lets staff book on behalf of a client (§12.5)', async () => {
    const client = await createClientUser();
    state.client = await signIn('zohar@demo.local');

    const response = await postAppointment(
      jsonReq('/api/appointments', {
        employeeId: EMPLOYEE_ZOHAR,
        serviceId: SERVICE_ZOHAR_HAIRCUT,
        startsAt: await firstFreeSlot(EMPLOYEE_ZOHAR, SERVICE_ZOHAR_HAIRCUT),
        clientProfileId: client.id,
      }),
      undefined,
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    createdAppointmentIds.push(body.id);

    const { data } = await admin
      .from('appointments')
      .select('client_profile_id, created_by')
      .eq('id', body.id)
      .single();
    // The client owns it; the staff member is recorded as its creator (§12.12).
    expect(data!.client_profile_id).toBe(client.id);
    expect(data!.created_by).not.toBe(client.id);
  });
});

describe('PATCH /api/appointments/[id] — §5.4', () => {
  it('cancels, and the freed slot becomes bookable again', async () => {
    const user = await createClientUser();
    state.client = await signIn(user.email);

    // Past Studio Zohar's 24-hour cancellation window, so the client is allowed to cancel.
    const startsAt = await firstFreeSlot(EMPLOYEE_ZOHAR, SERVICE_ZOHAR_HAIRCUT, 48);
    const created = await postAppointment(
      jsonReq('/api/appointments', {
        employeeId: EMPLOYEE_ZOHAR,
        serviceId: SERVICE_ZOHAR_HAIRCUT,
        startsAt,
      }),
      undefined,
    );
    const { id } = await created.json();
    createdAppointmentIds.push(id);

    const cancelled = await patchAppointment(
      jsonReq(`/api/appointments/${id}`, { action: 'cancel' }, 'PATCH'),
      params({ id }),
    );
    expect(cancelled.status).toBe(200);
    expect((await cancelled.json()).status).toBe('CANCELLED');

    // Soft delete: the row survives and leaves the exclusion index via the constraint's WHERE
    // clause, which is exactly what frees the slot.
    const { data } = await admin.from('appointments').select('status, cancelled_at').eq('id', id).single();
    expect(data).toMatchObject({ status: 'CANCELLED' });
    expect(data!.cancelled_at).not.toBeNull();

    expect(await firstFreeSlot(EMPLOYEE_ZOHAR, SERVICE_ZOHAR_HAIRCUT, 48)).toBe(startsAt);
  });

  /**
   * §12.2 / §6.3 — the cancellation window is the one rule that treats clients and staff
   * differently, so both halves are asserted on the *same* appointment.
   */
  it('refuses a client cancelling inside the window, but lets staff do it', async () => {
    const user = await createClientUser();

    // One hour from now, against Studio Zohar's 24-hour window. Seeded directly because the
    // availability engine would never offer a slot this close on a predictable schedule.
    const id = await seedAppointment(
      user.id,
      EMPLOYEE_ZOHAR,
      SERVICE_ZOHAR_HAIRCUT,
      new Date(Date.now() + 3_600_000),
      30,
    );

    state.client = await signIn(user.email);
    const byClient = await patchAppointment(jsonReq('/x', { action: 'cancel' }, 'PATCH'), params({ id }));

    expect(byClient.status).toBe(422);
    expect((await byClient.json()).error.message).toMatch(/no longer be cancelled online/i);

    // Staff and admins always bypass the window (§12.2).
    state.client = await signIn('zohar@demo.local');
    const byStaff = await patchAppointment(jsonReq('/x', { action: 'cancel' }, 'PATCH'), params({ id }));

    expect(byStaff.status).toBe(200);
    expect((await byStaff.json()).status).toBe('CANCELLED');
  });

  it('answers 422 when cancelling an already-cancelled appointment', async () => {
    const user = await createClientUser();
    state.client = await signIn(user.email);

    // Past the cancellation window, so the *first* cancel must succeed — otherwise this test
    // would pass on a window refusal and prove nothing about the status machine (§6.5).
    const created = await postAppointment(
      jsonReq('/api/appointments', {
        employeeId: EMPLOYEE_ZOHAR,
        serviceId: SERVICE_ZOHAR_HAIRCUT,
        startsAt: await firstFreeSlot(EMPLOYEE_ZOHAR, SERVICE_ZOHAR_HAIRCUT, 48),
      }),
      undefined,
    );
    const { id } = await created.json();
    createdAppointmentIds.push(id);

    const first = await patchAppointment(jsonReq('/x', { action: 'cancel' }, 'PATCH'), params({ id }));
    expect(first.status).toBe(200);

    const again = await patchAppointment(jsonReq('/x', { action: 'cancel' }, 'PATCH'), params({ id }));
    expect(again.status).toBe(422);
    expect((await again.json()).error.message).toMatch(/current status/i);
  });

  it('approves a PENDING appointment as the business, and rejects the client doing it', async () => {
    const user = await createClientUser();
    state.client = await signIn(user.email);

    const created = await postAppointment(
      jsonReq('/api/appointments', {
        employeeId: EMPLOYEE_DANA,
        serviceId: SERVICE_GLOW_FACIAL,
        startsAt: await firstFreeSlot(EMPLOYEE_DANA, SERVICE_GLOW_FACIAL),
      }),
      undefined,
    );
    const { id, status } = await created.json();
    createdAppointmentIds.push(id);
    expect(status).toBe('PENDING');

    // The client may not approve their own request — that is the business's decision (§4.4).
    const byClient = await patchAppointment(jsonReq('/x', { action: 'approve' }, 'PATCH'), params({ id }));
    expect(byClient.status).toBe(403);

    state.client = await signIn('dana@demo.local');
    const byStaff = await patchAppointment(jsonReq('/x', { action: 'approve' }, 'PATCH'), params({ id }));
    expect(byStaff.status).toBe(200);
    expect((await byStaff.json()).status).toBe('CONFIRMED');
  });

  it('reschedules to a new slot and frees the old one', async () => {
    const user = await createClientUser();
    state.client = await signIn(user.email);

    const original = await firstFreeSlot(EMPLOYEE_ZOHAR, SERVICE_ZOHAR_HAIRCUT);
    const created = await postAppointment(
      jsonReq('/api/appointments', {
        employeeId: EMPLOYEE_ZOHAR,
        serviceId: SERVICE_ZOHAR_HAIRCUT,
        startsAt: original,
      }),
      undefined,
    );
    const { id } = await created.json();
    createdAppointmentIds.push(id);

    const target = await firstFreeSlot(EMPLOYEE_ZOHAR, SERVICE_ZOHAR_HAIRCUT);
    const moved = await patchAppointment(
      jsonReq('/x', { action: 'reschedule', startsAt: target }, 'PATCH'),
      params({ id }),
    );

    expect(moved.status).toBe(200);
    const body = await moved.json();
    createdAppointmentIds.push(body.id);

    // §5.4 — a reschedule returns the **new** row, so its id differs from the one requested.
    expect(body.id).not.toBe(id);
    expect(new Date(body.startsAt).toISOString()).toBe(new Date(target).toISOString());
    expect(await firstFreeSlot(EMPLOYEE_ZOHAR, SERVICE_ZOHAR_HAIRCUT)).toBe(original);
  });

  it('rejects a reschedule with no startsAt at the schema boundary', async () => {
    const user = await createClientUser();
    state.client = await signIn(user.email);

    const response = await patchAppointment(
      jsonReq('/x', { action: 'reschedule' }, 'PATCH'),
      params({ id: '00000000-0000-4000-8000-00000000dead' }),
    );
    expect(response.status).toBe(400);
  });
});

describe('waitlist routes — §5.4', () => {
  it('creates an entry, defaults to any employee, then deletes it', async () => {
    const user = await createClientUser();
    state.client = await signIn(user.email);

    const fromTs = new Date(Date.now() + 86_400_000).toISOString();
    const toTs = new Date(Date.now() + 10 * 86_400_000).toISOString();

    const created = await postWaitlist(
      jsonReq('/api/waitlist', { businessId: GLOW_CLINIC, fromTs, toTs }),
      undefined,
    );
    expect(created.status).toBe(201);

    const { id, status } = await created.json();
    expect(status).toBe('ACTIVE');

    // No employeeIds means "any employee in the business" — no target rows at all (§3.10).
    const { count } = await admin
      .from('waitlist_employee_targets')
      .select('employee_id', { count: 'exact', head: true })
      .eq('waitlist_entry_id', id);
    expect(count).toBe(0);

    const removed = await deleteWaitlist(req('/x', { method: 'DELETE' }), params({ id }));
    expect(removed.status).toBe(204);
  });

  it('records targeted employees when given', async () => {
    const user = await createClientUser();
    state.client = await signIn(user.email);

    const created = await postWaitlist(
      jsonReq('/api/waitlist', {
        businessId: GLOW_CLINIC,
        serviceId: SERVICE_GLOW_FACIAL,
        employeeIds: [EMPLOYEE_DANA],
        fromTs: new Date(Date.now() + 86_400_000).toISOString(),
        toTs: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      }),
      undefined,
    );
    expect(created.status).toBe(201);

    const { id } = await created.json();
    const { data } = await admin
      .from('waitlist_employee_targets')
      .select('employee_id')
      .eq('waitlist_entry_id', id);
    expect(data!.map((row) => row.employee_id)).toEqual([EMPLOYEE_DANA]);
  });

  it('rejects an anonymous caller and an over-long range', async () => {
    state.client = anonClient();
    const anon = await postWaitlist(
      jsonReq('/api/waitlist', {
        businessId: GLOW_CLINIC,
        fromTs: new Date(Date.now() + 86_400_000).toISOString(),
        toTs: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      }),
      undefined,
    );
    expect(anon.status).toBe(401);

    const user = await createClientUser();
    state.client = await signIn(user.email);
    const tooLong = await postWaitlist(
      jsonReq('/api/waitlist', {
        businessId: GLOW_CLINIC,
        fromTs: new Date(Date.now() + 86_400_000).toISOString(),
        toTs: new Date(Date.now() + 200 * 86_400_000).toISOString(),
      }),
      undefined,
    );
    expect(tooLong.status).toBe(400);
  });

  it('will not let one client delete another’s entry', async () => {
    const owner = await createClientUser();
    state.client = await signIn(owner.email);

    const created = await postWaitlist(
      jsonReq('/api/waitlist', {
        businessId: GLOW_CLINIC,
        fromTs: new Date(Date.now() + 86_400_000).toISOString(),
        toTs: new Date(Date.now() + 5 * 86_400_000).toISOString(),
      }),
      undefined,
    );
    const { id } = await created.json();

    const stranger = await createClientUser();
    state.client = await signIn(stranger.email);

    // RLS hides the row entirely, so this is a 404 rather than a 403 — §8.1 merges the two on
    // purpose, since answering 403 would confirm the entry exists.
    const response = await deleteWaitlist(req('/x', { method: 'DELETE' }), params({ id }));
    expect(response.status).toBe(404);

    const { count } = await admin
      .from('waitlist_entries')
      .select('id', { count: 'exact', head: true })
      .eq('id', id);
    expect(count).toBe(1);
  });
});
