import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { Database } from '@/types/database.types';

/**
 * Business-portal reads against the seeded local stack. Same stubbing rationale as
 * `queries-public.test.ts`: only the cookie-bound client factory is replaced, so RLS is real.
 */
const state = vi.hoisted(() => ({ client: null as unknown as SupabaseClient<Database> }));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => state.client,
}));

const {
  getCurrentBusinessDashboard,
  getCurrentEmployment,
  listAvailabilityRules,
  listBusinessHours,
  listDashboardAppointments,
  listDashboardEmployees,
  listDashboardKpis,
  listDashboardServices,
  listJoinRequests,
} = await import('@/server/queries/dashboard');
const { listAreas, listCategories, listJoinableBusinesses, listMyBusinesses } = await import(
  '@/server/queries/business-entry'
);
const { countUnread, listNotifications } = await import('@/server/queries/notifications');

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const STUDIO_ZOHAR = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001';
const EMPLOYEE_ZOHAR = 'e0000000-0000-4000-8000-000000000001';

async function signIn(email: string): Promise<SupabaseClient<Database>> {
  const client = createSupabaseClient<Database>(URL_, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password: 'demo-password' });
  if (error) throw new Error(`Seed account ${email} could not sign in: ${error.message}`);
  return client;
}

describe('getCurrentEmployment — how the dashboard knows which business it is', () => {
  it('resolves the founder’s own ACTIVE employees row and flags ownership', async () => {
    state.client = await signIn('zohar@demo.local');

    expect(await getCurrentEmployment()).toMatchObject({
      employeeId: EMPLOYEE_ZOHAR,
      businessId: STUDIO_ZOHAR,
      isOwner: true,
    });
  });

  it('flags a non-founder employee as not the owner (§12.1 gates only join requests on this)', async () => {
    state.client = await signIn('miya@demo.local');

    expect(await getCurrentEmployment()).toMatchObject({ businessId: STUDIO_ZOHAR, isOwner: false });
  });

  it('returns null for a client with no employees row, which is what sends them to /onboarding', async () => {
    state.client = await signIn('client@demo.local');

    expect(await getCurrentEmployment()).toBeNull();
    expect(await getCurrentBusinessDashboard()).toBeNull();
  });
});

describe('dashboard reads (signed in as the founder)', () => {
  beforeAll(async () => {
    state.client = await signIn('zohar@demo.local');
  });

  it('returns the business with its policy fields', async () => {
    expect(await getCurrentBusinessDashboard()).toMatchObject({
      id: STUDIO_ZOHAR,
      timezone: 'Asia/Jerusalem',
      approvalPolicy: 'AUTO',
      cancellationWindowHours: 24,
      status: 'ACTIVE',
      isOwner: true,
    });
  });

  it('lists staff with service counts and an owner flag', async () => {
    const employees = await listDashboardEmployees(STUDIO_ZOHAR);

    expect(employees).toHaveLength(2);
    expect(employees.every((employee) => employee.serviceCount === 3)).toBe(true);
    expect(employees.filter((employee) => employee.isOwner)).toHaveLength(1);
    expect(employees.every((employee) => employee.fullName !== '')).toBe(true);
  });

  it('lists every service in the business, annotated with its owning employee', async () => {
    const services = await listDashboardServices(STUDIO_ZOHAR);

    expect(services).toHaveLength(6);
    expect(services.every((service) => service.employeeName !== '')).toBe(true);
    expect(new Set(services.map((service) => service.employeeId)).size).toBe(2);
  });

  it('shows the booked appointment with the client’s contact details', async () => {
    const appointments = await listDashboardAppointments(STUDIO_ZOHAR);

    expect(appointments).toHaveLength(1);
    expect(appointments[0]).toMatchObject({ status: 'CONFIRMED', time: '11:30' });
    expect(appointments[0].employeeName).not.toBe('');
    // The business needs to be able to contact whoever booked — §10.7's dashboard table has
    // "client" and "contact" columns.
    expect(appointments[0].clientName).toBe('נועה גולן');
    expect(appointments[0].clientPhone).not.toBeNull();
  });

  it('computes the overview tiles, flagging revenue as derived rather than banked', async () => {
    const kpis = await listDashboardKpis(STUDIO_ZOHAR);

    expect(kpis.map((kpi) => kpi.id).sort()).toEqual([
      'active-staff',
      'appointments-today',
      'pending-approval',
      'revenue',
    ]);
    expect(kpis.find((kpi) => kpi.id === 'active-staff')!.value).toBe(2);
    expect(kpis.find((kpi) => kpi.id === 'revenue')!.isMock).toBe(true);
  });

  it('returns opening hours as HH:mm, not Postgres’s HH:MM:SS', async () => {
    const hours = await listBusinessHours(STUDIO_ZOHAR);

    expect(hours).toHaveLength(6);
    expect(hours[0].opensAt).toMatch(/^\d{2}:\d{2}$/);
    expect(hours.map((row) => row.dayOfWeek)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('returns the employee’s weekly windows', async () => {
    const rules = await listAvailabilityRules(EMPLOYEE_ZOHAR);

    expect(rules).toHaveLength(6);
    expect(rules.every((rule) => rule.kind === 'WEEKLY_WINDOW')).toBe(true);
    expect(rules[0].startsAt).toMatch(/^\d{2}:\d{2}$/);
  });

  it('has no join requests to decide yet', async () => {
    expect(await listJoinRequests(STUDIO_ZOHAR)).toEqual([]);
  });
});

describe('business-entry reads', () => {
  it('offers the areas already in use rather than a curated list (§12.20)', async () => {
    state.client = await signIn('zohar@demo.local');

    const areas = await listAreas();
    expect(areas.map((area) => area.name)).toEqual(
      expect.arrayContaining(['תל אביב', 'הרצליה', 'חיפה']),
    );
  });

  it('lists the seeded categories with slugs', async () => {
    state.client = await signIn('zohar@demo.local');

    const categories = await listCategories();
    expect(categories.map((category) => category.slug)).toEqual(
      expect.arrayContaining(['beauty', 'cosmetics', 'fitness', 'clinics', 'lessons']),
    );
  });

  it('excludes a business the caller already works at', async () => {
    state.client = await signIn('zohar@demo.local');

    const joinable = await listJoinableBusinesses();
    expect(joinable.map((business) => business.id)).not.toContain(STUDIO_ZOHAR);
    expect(joinable.length).toBeGreaterThan(0);
    expect(joinable.every((business) => business.pendingRequestStatus === null)).toBe(true);
  });

  it('lists the founder’s own business as OWNER, with the roster size and their position', async () => {
    state.client = await signIn('zohar@demo.local');

    const mine = await listMyBusinesses();
    const studio = mine.find((business) => business.businessId === STUDIO_ZOHAR);

    expect(studio).toBeDefined();
    expect(studio).toMatchObject({ relation: 'OWNER', name: 'Studio Zohar - מספרת זוהר' });
    // `employees(count)` is the whole roster, not the caller's single row — the outer
    // `.eq('profile_id', …)` narrows which employments come back, not the embedded aggregate.
    expect(studio!.employeeCount).toBeGreaterThan(1);
    expect(studio!.positionTitle).toBeTruthy();
  });

  it('lists a non-founder’s employment as STAFF', async () => {
    state.client = await signIn('miya@demo.local');

    const mine = await listMyBusinesses();
    expect(mine.find((business) => business.businessId === STUDIO_ZOHAR)).toMatchObject({ relation: 'STAFF' });
  });

  it('returns nothing for an account with no employment and no open request', async () => {
    // The seeded CLIENT — every BUSINESS account in the seed already founds or staffs something.
    state.client = await signIn('client@demo.local');

    expect(await listMyBusinesses()).toEqual([]);
  });
});

describe('notification reads', () => {
  it('returns nothing for a fresh account and counts zero unread', async () => {
    state.client = await signIn('idan@demo.local');

    expect(await listNotifications()).toEqual([]);
    expect(await countUnread()).toBe(0);
  });
});
