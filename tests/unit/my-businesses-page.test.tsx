import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

// The dialogs import server actions, which cannot execute in jsdom. Only their call signatures
// matter to this file — the actions themselves are covered by `tests/int/`.
const selectBusinessForManagementMock = vi.fn().mockResolvedValue({ ok: true, data: { businessId: '' } });
vi.mock('@/server/actions/business', () => ({
  createBusiness: vi.fn(),
  selectBusinessForManagement: (...args: unknown[]) => selectBusinessForManagementMock(...args),
}));
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
    pendingJoinRequestCount: 1,
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
    pendingJoinRequestCount: 0,
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
    pendingJoinRequestCount: 0,
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
    expect(screen.getByRole('tab', { name: /pending requests\s*2/i })).toBeInTheDocument();

    // The pending row has no position yet — approval is what creates the employees row (§6.8).
    expect(screen.getByText('Waiting for the owner to decide on your request')).toBeInTheDocument();
    // …and therefore no manage control, unlike the two approved ones. It is named after its
    // business — it is stretched over the whole card, and three identical "Manage business"
    // buttons would name nothing.
    expect(screen.getByText('1 pending staff join requests')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage requests — Studio Zohar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage business — Glow Clinic' })).toBeInTheDocument();
  });

  // §12.64 — with more than one manageable business, "Manage business" cannot just be a link to a
  // fixed URL: `/businesses/manage` has no businessId in it, so nothing would tell the dashboard
  // which of the two cards was pressed. It must record the choice (via a server action, since
  // Next.js layouts can't read search params) before navigating there.
  it('records which business was chosen before opening the dashboard', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Manage business — Glow Clinic' }));

    await waitFor(() =>
      expect(selectBusinessForManagementMock).toHaveBeenCalledWith({ businessId: 'business-glow' }),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/businesses/manage'));
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

  it('shows an owned business in pending requests when staff are waiting to join', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('tab', { name: /pending requests/i }));

    expect(screen.getByText('Studio Zohar')).toBeInTheDocument();
    expect(screen.getByText('Barber Bros')).toBeInTheDocument();
    expect(screen.queryByText('Glow Clinic')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Manage requests — Studio Zohar' }));

    await waitFor(() =>
      expect(selectBusinessForManagementMock).toHaveBeenCalledWith({ businessId: 'business-zohar' }),
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/businesses/manage/staff'));
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
