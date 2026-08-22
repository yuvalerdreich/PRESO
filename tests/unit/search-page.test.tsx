import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BusinessSummary, Category } from '@/types/domain';

/**
 * Same reasoning as `home-page.test.tsx`: the routes are Server Components reading through
 * `server/queries/*`, so the query module is stubbed and this covers the search behaviour itself —
 * that filtering happens **in place** (§12.43) rather than by navigating, that it matches staff
 * names, and that the two empty states say different things.
 */
const businesses: BusinessSummary[] = [
  {
    id: 'b-1',
    name: 'Studio Zohar',
    categoryId: 'cat-hair',
    area: 'Tel Aviv',
    address: '142 Dizengoff Street',
    description: '',
    photoUrl: '',
    employeeCount: 1,
    employeeAvatarUrls: [],
    employeeNames: ['Zohar Levi'],
    approvalPolicy: 'AUTO',
  viewerRelation: null,
  },
  {
    id: 'b-2',
    name: 'Glow Clinic',
    categoryId: 'cat-health',
    area: 'Herzliya',
    address: '8 Abba Eban Boulevard',
    description: '',
    photoUrl: '',
    employeeCount: 1,
    employeeAvatarUrls: [],
    employeeNames: ['Dana Cohen'],
    approvalPolicy: 'MANUAL',
  viewerRelation: null,
  },
];

const categories: Category[] = [
  { id: 'cat-hair', slug: 'hair-beauty', icon: 'scissors', name: 'Hair and beauty' },
  { id: 'cat-health', slug: 'health-wellness', icon: 'stethoscope', name: 'Health' },
];

vi.mock('@/server/queries/discovery', () => ({
  listCategories: async () => categories,
  listBusinessAreas: async () => ['Tel Aviv', 'Herzliya'],
  searchBusinesses: async () => businesses,
}));

import SearchPage from '@/app/(public)/search/page';
import HomePage from '@/app/(public)/page';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import { translations } from '@/lib/i18n/translations';

const copy = translations.en;

async function renderPage(node: Promise<React.ReactElement>) {
  render(<LanguageProvider initialLocale="en">{await node}</LanguageProvider>);
}

describe('discovery search', () => {
  it('filters the grid in place as you type, without navigating', async () => {
    await renderPage(HomePage({ searchParams: Promise.resolve({}), params: Promise.resolve({}) }) as Promise<React.ReactElement>);

    expect(screen.getByText('Studio Zohar')).toBeInTheDocument();
    expect(screen.getByText('Glow Clinic')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'glow' } });

    expect(screen.queryByText('Studio Zohar')).not.toBeInTheDocument();
    expect(screen.getByText('Glow Clinic')).toBeInTheDocument();
  });

  it('matches a business by the name of someone who works there (§12.22)', async () => {
    await renderPage(HomePage({ searchParams: Promise.resolve({}), params: Promise.resolve({}) }) as Promise<React.ReactElement>);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zohar levi' } });

    expect(screen.getByText('Studio Zohar')).toBeInTheDocument();
    expect(screen.queryByText('Glow Clinic')).not.toBeInTheDocument();
  });

  it('shows the "no match" wording only once a search excluded everything', async () => {
    await renderPage(HomePage({ searchParams: Promise.resolve({}), params: Promise.resolve({}) }) as Promise<React.ReactElement>);

    expect(screen.queryByText(copy.emptyState.noMatchesTitle)).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nothing-matches-this' } });

    expect(screen.getByText(copy.emptyState.noMatchesTitle)).toBeInTheDocument();
    expect(screen.queryByText(copy.emptyState.title)).not.toBeInTheDocument();
  });

  it('seeds the box from /search?q= and clears back to everything', async () => {
    await renderPage(
      SearchPage({
        params: Promise.resolve({}),
        searchParams: Promise.resolve({ q: 'glow' }),
      } as never) as Promise<React.ReactElement>,
    );

    expect(screen.getByRole('searchbox')).toHaveValue('glow');
    expect(screen.queryByText('Studio Zohar')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    expect(screen.getByText('Studio Zohar')).toBeInTheDocument();
  });
});
