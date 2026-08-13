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

    expect(screen.getByRole('heading', { level: 1, name: 'Studio Zohar' })).toBeInTheDocument();
    expect(screen.getByText('Zohar Levi')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Haircut and styling' })).toBeInTheDocument();
    expect(screen.queryByText('Organic professional color & tones')).not.toBeInTheDocument();
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

    expect(screen.getByText('Miya Cohen')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Organic professional color & tones' })).toBeInTheDocument();
    expect(screen.queryByText('Traditional beard styling & shave')).not.toBeInTheDocument();
    // Both staff members independently offer this service — it should still show for Miya.
    expect(screen.getByRole('heading', { level: 3, name: 'Haircut and styling' })).toBeInTheDocument();
  });
});
