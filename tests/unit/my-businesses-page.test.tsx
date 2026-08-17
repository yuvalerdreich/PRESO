import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MyBusinessesPage } from '@/components/business/my-businesses-page';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import type { BusinessSummary } from '@/types/domain';

const businesses: BusinessSummary[] = [
  {
    id: 'studio-zohar',
    name: 'Studio Zohar',
    categoryId: 'beauty',
    area: 'Tel Aviv',
    address: '142 Dizengoff Street',
    description: 'Hair and beauty studio',
    photoUrl: 'https://example.com/studio.jpg',
    employeeCount: 2,
    employeeAvatarUrls: [],
    approvalPolicy: 'AUTO',
  },
];

describe('my businesses page', () => {
  it('shows the business actions, filters, and empty state', () => {
    render(
      <LanguageProvider initialLocale="en">
        <MyBusinessesPage joinableBusinesses={businesses} />
      </LanguageProvider>,
    );

    expect(screen.getByRole('heading', { name: 'My businesses' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open a new business' }));
    expect(screen.getByRole('dialog', { name: 'Open a new business' })).toBeInTheDocument();
    expect(screen.getByText('1. Business details and category')).toBeInTheDocument();
    expect(screen.getByText('4. Cancellation, booking, and payment policies')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add service' }));
    expect(screen.getByText('Service name #2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    fireEvent.click(screen.getByRole('button', { name: 'Join an existing business' }));
    expect(screen.getByRole('dialog', { name: 'Join an existing business' })).toBeInTheDocument();
    expect(screen.getByText('1. Find and select a business to join')).toBeInTheDocument();
    expect(screen.getAllByText('Studio Zohar').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.getByRole('heading', { name: 'No businesses linked yet' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /active staff/i }));
    expect(screen.getByRole('tab', { name: /active staff/i })).toHaveAttribute('aria-selected', 'true');
  });
});
