import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import BusinessPage from '@/app/(public)/b/[businessId]/page';
import EmployeePage from '@/app/(public)/b/[businessId]/e/[employeeId]/page';
import { LanguageProvider } from '@/lib/i18n/language-provider';

const businessId = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001';

describe('public business profile pages', () => {
  it('renders a business roster with employee route links', async () => {
    render(
      <LanguageProvider initialLocale="en">
        {await BusinessPage({ params: Promise.resolve({ businessId }) })}
      </LanguageProvider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Studio Zohar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view services for zohar levi/i })).toHaveAttribute(
      'href',
      `/b/${businessId}/e/e-zohar`,
    );
  });

  it('renders services for only the selected employee', async () => {
    render(
      <LanguageProvider initialLocale="en">
        {await EmployeePage({ params: Promise.resolve({ businessId, employeeId: 'e-zohar' }) })}
      </LanguageProvider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Zohar Levi' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Haircut and styling' })).toBeInTheDocument();
    expect(screen.queryByText('Restorative hair treatment')).not.toBeInTheDocument();
  });
});
