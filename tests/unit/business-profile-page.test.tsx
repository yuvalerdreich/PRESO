import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import BusinessPage from '@/app/(public)/b/[businessId]/page';
import EmployeePage from '@/app/(public)/b/[businessId]/e/[employeeId]/page';
import { LanguageProvider } from '@/lib/i18n/language-provider';

const businessId = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001';

describe('public business profile page (merged staff-picker + services)', () => {
  it('redirects the bare business route to its first employee', async () => {
    await expect(
      BusinessPage({ params: Promise.resolve({ businessId }), searchParams: Promise.resolve({}) }),
    ).rejects.toMatchObject({
      digest: expect.stringContaining(`/b/${businessId}/e/e-zohar`),
    });
  });

  it('renders the business hero and the selected employee’s services by default', async () => {
    render(
      <LanguageProvider initialLocale="en">
        {await EmployeePage({
          params: Promise.resolve({ businessId, employeeId: 'e-zohar' }),
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
          params: Promise.resolve({ businessId, employeeId: 'e-miya' }),
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
