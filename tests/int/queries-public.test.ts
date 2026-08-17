import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { Database } from '@/types/database.types';

/**
 * `server/queries/*` against the real local stack and the real `supabase/seed.sql`.
 *
 * The only thing stubbed is `lib/supabase/server.ts`, whose `createClient()` reads the session
 * from `next/headers` — cookies that exist during a request and not in a test runner. Swapping in
 * a genuine `@supabase/supabase-js` client keeps everything that matters real: the same SQL, the
 * same RLS policies, the same seeded rows. Anonymous vs signed-in is then just which client is
 * installed, which is exactly the distinction these tests need to make.
 */
const state = vi.hoisted(() => ({ client: null as unknown as SupabaseClient<Database> }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => state.client,
}));

const {
  getBusinessEmployee,
  getBusinessProfile,
  getServiceById,
  listBusinessEmployees,
  listCategories,
  listEmployeeServices,
  searchBusinesses,
} = await import('@/server/queries/discovery');
const { assertBookablePair, getDaySlots, getMonthAvailability, getNextAvailable } = await import(
  '@/server/queries/availability'
);
const { listClientAppointments, listClientWaitlistEntries } = await import('@/server/queries/appointments');

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Seeded ids (supabase/seed.sql).
const STUDIO_ZOHAR = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001';
const GLOW_CLINIC = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1002';
const APEX_FITNESS = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1000';
const EMPLOYEE_ZOHAR = 'e0000000-0000-4000-8000-000000000001';
const EMPLOYEE_MIYA = 'e0000000-0000-4000-8000-000000000002';
const SERVICE_ZOHAR_HAIRCUT = '50000000-0000-4000-8000-000000000002';
const SERVICE_MIYA_HAIRCUT = '50000000-0000-4000-8000-000000000005';

function anonClient(): SupabaseClient<Database> {
  return createSupabaseClient<Database>(URL_, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signedInClient(email: string): Promise<SupabaseClient<Database>> {
  const client = createSupabaseClient<Database>(URL_, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: 'demo-password' });
  if (error) throw new Error(`Seed account ${email} could not sign in: ${error.message}`);
  return client;
}

/** The seed dates its appointment to the next Monday, so "soon" is always inside the horizon. */
function nextMondayISO(): string {
  const date = new Date();
  const daysAhead = ((1 - date.getUTCDay() + 7) % 7) + 7;
  date.setUTCDate(date.getUTCDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

describe('discovery queries (anonymous)', () => {
  beforeAll(() => {
    state.client = anonClient();
  });

  it('lists the seeded categories with a slug and a presentation icon', async () => {
    const categories = await listCategories();

    expect(categories.length).toBeGreaterThanOrEqual(5);
    const beauty = categories.find((c) => c.slug === 'beauty');
    expect(beauty).toMatchObject({ slug: 'beauty', icon: 'scissors' });
    // Bilingual labels come from lib/i18n/categories.ts, not from the database.
    expect(beauty!.name.he).not.toBe(beauty!.name.en);
  });

  it('returns the seeded businesses with photo, staff count and avatars resolved', async () => {
    const businesses = await searchBusinesses();

    // `arrayContaining`, not equality: the integration project shares one database, so another
    // suite's fixture business appearing here is expected rather than a failure.
    expect(businesses.map((b) => b.id)).toEqual(
      expect.arrayContaining([APEX_FITNESS, STUDIO_ZOHAR, GLOW_CLINIC]),
    );

    const zohar = businesses.find((b) => b.id === STUDIO_ZOHAR)!;
    expect(zohar.employeeCount).toBe(2);
    expect(zohar.employeeAvatarUrls).toHaveLength(2);
    expect(zohar.photoUrl).toMatch(/^https?:\/\//);
    expect(zohar.approvalPolicy).toBe('AUTO');

    // Glow Clinic is the one MANUAL business, so both booking outcomes stay reachable.
    expect(businesses.find((b) => b.id === GLOW_CLINIC)!.approvalPolicy).toBe('MANUAL');
  });

  it('matches `q` against the business name', async () => {
    const results = await searchBusinesses({ q: 'Zohar' });
    expect(results.map((b) => b.id)).toEqual([STUDIO_ZOHAR]);
  });

  it('matches `q` against a staff member’s name too (§12.22)', async () => {
    // "מיה כהן" is a stylist at Studio Zohar and appears in no business name.
    const results = await searchBusinesses({ q: 'מיה' });
    expect(results.map((b) => b.id)).toContain(STUDIO_ZOHAR);
  });

  it('filters by category slug rather than id', async () => {
    expect((await searchBusinesses({ category: 'fitness' })).map((b) => b.id)).toEqual([APEX_FITNESS]);
    expect(await searchBusinesses({ category: 'no-such-category' })).toEqual([]);
  });

  it('filters by area', async () => {
    expect((await searchBusinesses({ area: 'חיפה' })).map((b) => b.id)).toEqual([APEX_FITNESS]);
  });

  it('returns a full business profile including timezone and cancellation window', async () => {
    const business = await getBusinessProfile(GLOW_CLINIC);

    expect(business).toMatchObject({
      id: GLOW_CLINIC,
      timezone: 'Asia/Jerusalem',
      cancellationWindowHours: 48,
      approvalPolicy: 'MANUAL',
    });
    expect(business!.phone).toBeTruthy();
  });

  it('returns null for an unknown business rather than throwing', async () => {
    expect(await getBusinessProfile('00000000-0000-4000-8000-00000000dead')).toBeNull();
  });

  it('lists a business’s active staff with names and avatars', async () => {
    const employees = await listBusinessEmployees(STUDIO_ZOHAR);

    expect(employees).toHaveLength(2);
    for (const employee of employees) {
      expect(employee.fullName).not.toBe('');
      expect(employee.avatarUrl).toMatch(/^https?:\/\//);
      expect(employee.businessId).toBe(STUDIO_ZOHAR);
    }
  });

  it('scopes services to the selected employee, never the business (PDF §8 rule 8)', async () => {
    const zoharServices = await listEmployeeServices(STUDIO_ZOHAR, EMPLOYEE_ZOHAR);
    const miyaServices = await listEmployeeServices(STUDIO_ZOHAR, EMPLOYEE_MIYA);

    expect(zoharServices).toHaveLength(3);
    expect(miyaServices).toHaveLength(3);
    expect(zoharServices.every((s) => s.employeeId === EMPLOYEE_ZOHAR)).toBe(true);

    // Both stylists offer a service of the same name at the same price; they are still distinct
    // rows owned by different employees, which is the whole point of services belonging to a
    // position rather than a business.
    const shared = 'תספורת ועיצוב שיער (גברים/נשים)';
    expect(zoharServices.find((s) => s.name === shared)!.id).not.toBe(
      miyaServices.find((s) => s.name === shared)!.id,
    );
  });

  it('rejects a business/employee pair that does not belong together', async () => {
    expect(await listEmployeeServices(GLOW_CLINIC, EMPLOYEE_ZOHAR)).toEqual([]);
    expect(await getBusinessEmployee(GLOW_CLINIC, EMPLOYEE_ZOHAR)).toBeNull();
  });

  it('carries the service description added in migration 0015', async () => {
    const service = await getServiceById(SERVICE_ZOHAR_HAIRCUT);
    expect(service!.description).not.toBe('');
    expect(service).toMatchObject({ durationMinutes: 30, bufferMinutes: 10, status: 'ACTIVE' });
  });
});

describe('availability queries — the real engine, not the §12.25 mock', () => {
  beforeAll(() => {
    state.client = anonClient();
  });

  it('packs slots at duration + buffer rather than a fixed grid (§12.6)', async () => {
    const times = await getDaySlots(EMPLOYEE_ZOHAR, SERVICE_ZOHAR_HAIRCUT, nextMondayISO());

    expect(times.length).toBeGreaterThan(0);
    expect(times[0]).toBe('09:00');
    // 30-minute service + 10-minute buffer = a 40-minute step.
    expect(times[1]).toBe('09:40');
  });

  it('gives different employees different grids, so changing staff really refetches (§12.9)', async () => {
    const date = nextMondayISO();
    const zohar = await getDaySlots(EMPLOYEE_ZOHAR, SERVICE_ZOHAR_HAIRCUT, date);
    const miya = await getDaySlots(EMPLOYEE_MIYA, SERVICE_MIYA_HAIRCUT, date);

    // Zohar works from 09:00, Miya from 11:00.
    expect(zohar[0]).toBe('09:00');
    expect(miya[0]).toBe('11:00');
  });

  it('excludes the seeded 11:30 booking and its buffer-adjacent neighbours', async () => {
    const times = await getDaySlots(EMPLOYEE_ZOHAR, SERVICE_ZOHAR_HAIRCUT, nextMondayISO());

    expect(times).not.toContain('11:00');
    expect(times).not.toContain('11:40');
    expect(times).toContain('12:20');
  });

  it('returns no slots on a Saturday, when the business is closed', async () => {
    const monday = new Date(`${nextMondayISO()}T00:00:00Z`);
    monday.setUTCDate(monday.getUTCDate() + 5); // Monday + 5 = Saturday
    expect(await getDaySlots(EMPLOYEE_ZOHAR, SERVICE_ZOHAR_HAIRCUT, monday.toISOString().slice(0, 10))).toEqual(
      [],
    );
  });

  it('reports the month’s open dates for the calendar', async () => {
    const month = nextMondayISO().slice(0, 7);
    const dates = await getMonthAvailability(EMPLOYEE_ZOHAR, SERVICE_ZOHAR_HAIRCUT, month);

    expect(dates.length).toBeGreaterThan(0);
    expect(dates).toEqual([...dates].sort());
    expect(dates.every((d) => d.startsWith(month))).toBe(true);
  });

  it('answers the §5.3 422 case: a service not offered by that employee', async () => {
    await expect(assertBookablePair(EMPLOYEE_MIYA, SERVICE_ZOHAR_HAIRCUT)).rejects.toMatchObject({
      code: 'UNPROCESSABLE',
    });
  });

  it('passes the same guard for a genuinely bookable pair', async () => {
    await expect(assertBookablePair(EMPLOYEE_ZOHAR, SERVICE_ZOHAR_HAIRCUT)).resolves.toBeUndefined();
  });

  it('reports a next-available time per business (§6.6)', async () => {
    const next = await getNextAvailable(STUDIO_ZOHAR);
    expect(next).not.toBeNull();
    expect(new Date(next!).getTime()).toBeGreaterThanOrEqual(Date.now() - 60_000);
  });

  it('returns null next-available when serviceQ matches nothing', async () => {
    expect(await getNextAvailable(STUDIO_ZOHAR, { serviceQuery: 'skydiving' })).toBeNull();
  });
});

describe('client appointment queries', () => {
  it('returns empty lists for an anonymous visitor rather than throwing', async () => {
    state.client = anonClient();

    expect(await listClientAppointments()).toEqual([]);
    expect(await listClientWaitlistEntries()).toEqual([]);
  });

  it('returns the signed-in client’s own appointment, in the business timezone', async () => {
    state.client = await signedInClient('client@demo.local');

    const appointments = await listClientAppointments();
    expect(appointments).toHaveLength(1);
    expect(appointments[0]).toMatchObject({
      status: 'CONFIRMED',
      time: '11:30',
      dateISO: nextMondayISO(),
    });
    expect(appointments[0].businessName).toContain('Zohar');
    expect(appointments[0].employeeName).not.toBe('');
  });

  it('returns the signed-in client’s waitlist entry', async () => {
    state.client = await signedInClient('client@demo.local');

    const entries = await listClientWaitlistEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ status: 'ACTIVE' });
    expect(entries[0].requestedRange).toMatch(/^\d{2}:\d{2} - \d{2}:\d{2}$/);
    // The seeded entry targets one specific employee, so the name has to resolve — this is the
    // same `profiles`-is-not-publicly-readable trap the appointment reader fell into.
    expect(entries[0].employeeName).toBe('דנה כהן');
    expect(entries[0].serviceName).not.toBe('');
    expect(entries[0].businessName).toContain('Glow');
  });

  it('does not leak another client’s appointments — RLS, not a filter, decides this', async () => {
    // Signing in as a business owner who is not the client on the seeded appointment.
    state.client = await signedInClient('idan@demo.local');

    // Apex's owner is not the client, the assigned employee, or the owner of Studio Zohar.
    expect(await listClientAppointments()).toEqual([]);
  });
});
