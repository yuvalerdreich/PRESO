import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BusinessProfile, EmployeeSummary, ServiceSummary } from '@/types/domain';

const businessId = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001';
const ZOHAR = 'e0000000-0000-4000-8000-000000000001';
const MIYA = 'e0000000-0000-4000-8000-000000000002';

/**
 * These pages are Server Components that read through `server/queries/discovery`, which opens a
 * cookie-bound Supabase client — impossible under jsdom, where there is no request store. The
 * query module is stubbed so this stays what it has always been: a test of how the page composes
 * its data, not of how that data is fetched. The fetching is covered against the real database in
 * `tests/int/queries-public.test.ts`.
 *
 * The fixture is deliberately shaped around the one rule this page exists to demonstrate:
 * **services belong to an employee, not a business** (§3.8, PDF §8 rule 8). Both stylists offer
 * "תספורת ועיצוב שיער" as separate rows, so "shared service still shows for the other employee"
 * is a real assertion rather than an artefact of a shared list.
 */
const business: BusinessProfile = {
  id: businessId,
  name: 'Studio Zohar - מספרת זוהר',
  categoryId: 'category-beauty',
  area: 'תל אביב',
  address: 'רחוב דיזנגוף 142, תל אביב',
  description: 'סטודיו לעיצוב שיער.',
  photoUrl: 'https://example.test/studio.jpg',
  employeeCount: 2,
  employeeAvatarUrls: [],
  employeeNames: [],
  approvalPolicy: 'AUTO',
  phone: '03-6001122',
  timezone: 'Asia/Jerusalem',
  cancellationWindowHours: 24,
  ownerProfileId: 'profile-zohar',
};

const employees: EmployeeSummary[] = [
  {
    id: ZOHAR,
    businessId,
    fullName: 'זוהר לוי',
    positionTitle: 'מעצב שיער ראשי ומנהל',
    avatarUrl: 'https://example.test/zohar.jpg',
  },
  {
    id: MIYA,
    businessId,
    fullName: 'מיה כהן',
    positionTitle: 'מומחית גוונים וכימיקלים',
    avatarUrl: 'https://example.test/miya.jpg',
  },
];

const service = (
  id: string,
  employeeId: string,
  name: string,
  description = 'תיאור השירות.',
): ServiceSummary => ({
  id,
  employeeId,
  name,
  description,
  price: 120,
  durationMinutes: 30,
  bufferMinutes: 10,
  status: 'ACTIVE',
});

const servicesByEmployee: Record<string, ServiceSummary[]> = {
  [ZOHAR]: [
    service('s-zohar-1', ZOHAR, 'עיצוב זקן וגילוח מסורתי'),
    service('s-zohar-2', ZOHAR, 'תספורת ועיצוב שיער (גברים/נשים)'),
  ],
  [MIYA]: [
    service('s-miya-1', MIYA, 'גוונים וצבע אורגני מקצועי'),
    service('s-miya-2', MIYA, 'תספורת ועיצוב שיער (גברים/נשים)'),
  ],
};

vi.mock('@/server/queries/discovery', () => ({
  getBusinessProfile: async () => business,
  listCategories: async () => [
    { id: 'category-beauty', slug: 'beauty', icon: 'scissors', name: { he: 'מספרות', en: 'Salons' } },
  ],
  listBusinessEmployees: async () => employees,
  getBusinessEmployee: async (_businessId: string, employeeId: string) =>
    employees.find((employee) => employee.id === employeeId) ?? null,
  listEmployeeServices: async (_businessId: string, employeeId: string) =>
    servicesByEmployee[employeeId] ?? [],
}));

const { default: BusinessPage } = await import('@/app/(public)/b/[businessId]/page');
const { default: EmployeePage } = await import('@/app/(public)/b/[businessId]/e/[employeeId]/page');
const { LanguageProvider } = await import('@/lib/i18n/language-provider');

describe('public business profile page (merged staff-picker + services)', () => {
  it('redirects the bare business route to its first employee', async () => {
    await expect(
      BusinessPage({ params: Promise.resolve({ businessId }), searchParams: Promise.resolve({}) }),
    ).rejects.toMatchObject({
      digest: expect.stringContaining(`/b/${businessId}/e/${ZOHAR}`),
    });
  });

  it('renders the business hero and the selected employee’s services by default', async () => {
    render(
      <LanguageProvider initialLocale="en">
        {await EmployeePage({
          params: Promise.resolve({ businessId, employeeId: ZOHAR }),
          searchParams: Promise.resolve({}),
        })}
      </LanguageProvider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Studio Zohar - מספרת זוהר' })).toBeInTheDocument();
    expect(screen.getByText('זוהר לוי')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'תספורת ועיצוב שיער (גברים/נשים)' })).toBeInTheDocument();
    expect(screen.queryByText('גוונים וצבע אורגני מקצועי')).not.toBeInTheDocument();
  });

  it('switches to another employee’s own services, keeping shared services visible', async () => {
    render(
      <LanguageProvider initialLocale="en">
        {await EmployeePage({
          params: Promise.resolve({ businessId, employeeId: MIYA }),
          searchParams: Promise.resolve({}),
        })}
      </LanguageProvider>,
    );

    expect(screen.getByText('מיה כהן')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'גוונים וצבע אורגני מקצועי' })).toBeInTheDocument();
    expect(screen.queryByText('עיצוב זקן וגילוח מסורתי')).not.toBeInTheDocument();
    // Both staff members independently offer this service — it should still show for Miya.
    expect(screen.getByRole('heading', { level: 3, name: 'תספורת ועיצוב שיער (גברים/נשים)' })).toBeInTheDocument();
  });
});
