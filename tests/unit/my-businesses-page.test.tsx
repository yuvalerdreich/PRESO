import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// The dialogs import server actions, which cannot execute in jsdom. Only their call signatures
// matter to this file — the actions themselves are covered by `tests/int/`.
vi.mock('@/server/actions/business', () => ({ createBusiness: vi.fn() }));
vi.mock('@/server/actions/employee', () => ({ sendJoinRequest: vi.fn() }));

import { MyBusinessesPage } from '@/components/business/my-businesses-page';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import type { BusinessCategory, JoinableBusiness, MyBusiness } from '@/types/domain';

const categories: BusinessCategory[] = [{ id: 'cat-1', slug: 'hair-beauty', name: 'Hair and beauty' }];

const joinableBusinesses: JoinableBusiness[] = [
  {
    id: 'business-glow',
    name: 'Glow Clinic',
    area: 'Herzliya',
    categoryName: 'Health and wellness',
    employeeCount: 3,
    pendingRequestStatus: null,
  },
  {
    id: 'business-requested',
    name: 'Barber Bros',
    area: 'Haifa',
    categoryName: 'Hair and beauty',
    employeeCount: 2,
    pendingRequestStatus: 'PENDING',
  },
];

const myBusinesses: MyBusiness[] = [
  {
    key: 'employee-1',
    businessId: 'business-zohar',
    name: 'Studio Zohar',
    area: 'Tel Aviv',
    address: '142 Dizengoff Street',
    categoryName: 'Hair and beauty',
    photoUrl: '',
    employeeCount: 2,
    relation: 'OWNER',
    positionTitle: 'Owner',
    employeeStatus: 'ACTIVE',
  },
  {
    key: 'employee-2',
    businessId: 'business-glow',
    name: 'Glow Clinic',
    area: 'Herzliya',
    address: '8 Abba Eban Boulevard',
    categoryName: 'Health and wellness',
    photoUrl: '',
    employeeCount: 3,
    relation: 'STAFF',
    positionTitle: 'Aesthetician',
    employeeStatus: 'ACTIVE',
  },
  {
    key: 'request-1',
    businessId: 'business-requested',
    name: 'Barber Bros',
    area: 'Haifa',
    address: '3 Herzl Street',
    categoryName: 'Hair and beauty',
    photoUrl: '',
    employeeCount: 2,
    relation: 'PENDING',
    positionTitle: null,
    employeeStatus: null,
  },
];

function renderPage(businesses: MyBusiness[] = myBusinesses) {
  render(
    <LanguageProvider initialLocale="en">
      <MyBusinessesPage
        businesses={businesses}
        joinableBusinesses={joinableBusinesses}
        categories={categories}
      />
    </LanguageProvider>,
  );
}

describe('my businesses page', () => {
  it('lists the caller’s real businesses with counts derived from the rows', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'My businesses' })).toBeInTheDocument();
    expect(screen.getByText('3 linked businesses found')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /all\s*3/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /owned by me\s*1/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /active staff\s*1/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /pending requests\s*1/i })).toBeInTheDocument();

    // The pending row has no position yet — approval is what creates the employees row (§6.8).
    expect(screen.getByText('Waiting for the owner to decide on your request')).toBeInTheDocument();
    // …and therefore no dashboard link, unlike the two approved ones. The link is named after its
    // business — it is stretched over the whole card, and three identical "Manage business" links
    // would name nothing.
    expect(screen.getAllByRole('link', { name: /^Manage business —/ })).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Manage business — Studio Zohar' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
  });

  it('filters by relation', () => {
    renderPage();

    fireEvent.click(screen.getByRole('tab', { name: /owned by me/i }));
    expect(screen.getByRole('tab', { name: /owned by me/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('1 linked businesses found')).toBeInTheDocument();
    expect(screen.queryByText('Glow Clinic')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /^all/i }));
    expect(screen.getByText('3 linked businesses found')).toBeInTheDocument();
    expect(screen.getByText('Glow Clinic')).toBeInTheDocument();
    expect(screen.getByText('Studio Zohar')).toBeInTheDocument();
  });

  it('shows the empty state only when the account has no businesses at all', () => {
    renderPage([]);

    expect(screen.getByRole('heading', { name: 'No businesses linked yet' })).toBeInTheDocument();
  });

  it('opens the create and join dialogs, and blocks a business already requested', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Open a new business' }));
    expect(screen.getByRole('dialog', { name: 'Open a new business' })).toBeInTheDocument();
    expect(screen.getByText('1. Business details and category')).toBeInTheDocument();
    expect(screen.getByText('4. Cancellation, approval and payment notes')).toBeInTheDocument();
    // Categories come from the database now, not a hard-coded pair of options. This fixture's
    // slug has no entry in `categoryPresentation()`, so it renders the database name — the
    // fallback an admin-created category relies on (§12.44's sibling fix).
    expect(screen.getByRole('option', { name: 'Hair and beauty' })).toBeInTheDocument();
    // §12.44 — the free-text payment note the step's heading has always promised.
    expect(screen.getByPlaceholderText(/Payment at the end of the appointment/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add service' }));
    expect(screen.getByText('Service name #2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    fireEvent.click(screen.getByRole('button', { name: 'Join an existing business' }));
    expect(screen.getByRole('dialog', { name: 'Join an existing business' })).toBeInTheDocument();
    expect(screen.getByText('1. Find and select a business to join')).toBeInTheDocument();
    expect(screen.getByText('Already requested')).toBeInTheDocument();
  });
});
