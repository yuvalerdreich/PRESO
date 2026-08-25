import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import type { BusinessSearchResult, BusinessSearchResultItem, Category } from '@/types/domain';

/**
 * Same reasoning as `home-page.test.tsx`: the routes are Server Components reading through
 * `server/queries/*`, so the query module is stubbed and this covers the search behaviour itself —
 * that a filter change updates the grid, that it matches staff names, and that the two empty
 * states say different things.
 *
 * Discovery search used to filter an already-fully-fetched array in the browser
 * (`filterBusinesses()`); it now goes through `useBusinessSearch()` → `GET /api/businesses`
 * (§5.2's real pagination, wired up after finding the old shape shipped every business on every
 * page load regardless of what matched). That means a filter change is now a real, if fast, fetch
 * rather than a synchronous re-render — the assertions below `waitFor` the grid to settle instead
 * of checking it immediately after `fireEvent.change`. `global.fetch` is stubbed with the same
 * name/staff/area/category matching the real `searchBusinessesPaged()` implements, just against
 * this fixture instead of Postgres.
 */
const categories: Category[] = [
  { id: 'cat-hair', slug: 'hair-beauty', icon: 'scissors', name: 'Hair and beauty' },
  { id: 'cat-health', slug: 'health-wellness', icon: 'stethoscope', name: 'Health' },
];

const businesses: BusinessSearchResultItem[] = [
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
    category: { id: 'cat-hair', slug: 'hair-beauty', name: 'Hair and beauty' },
    priceRange: null,
    nextAvailableAt: null,
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
    category: { id: 'cat-health', slug: 'health-wellness', name: 'Health' },
    priceRange: null,
    nextAvailableAt: null,
  },
];

function filterFixture(params: URLSearchParams): BusinessSearchResultItem[] {
  const q = params.get('q')?.toLowerCase().trim();
  const area = params.get('area');
  const category = params.get('category');

  return businesses.filter((business) => {
    if (category && business.category.slug !== category) return false;
    if (area && business.area !== area) return false;
    if (q) {
      const haystack = [business.name, ...business.employeeNames].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

vi.mock('@/server/queries/discovery', () => ({
  listCategories: async () => categories,
  listBusinessAreas: async () => ['Tel Aviv', 'Herzliya'],
  searchBusinessesPaged: async (query: { q?: string; area?: string; category?: string; page: number; pageSize: number }) => {
    const params = new URLSearchParams();
    if (query.q) params.set('q', query.q);
    if (query.area) params.set('area', query.area);
    if (query.category) params.set('category', query.category);
    const items = filterFixture(params);
    return { items, page: query.page, pageSize: query.pageSize, total: items.length } satisfies BusinessSearchResult;
  },
  getBusinessProfile: async () => null,
}));

import SearchPage from '@/app/(public)/search/page';
import HomePage from '@/app/(public)/page';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import { translations } from '@/lib/i18n/translations';

const copy = translations.en;

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input), 'http://localhost');
    const items = filterFixture(url.searchParams);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20');
    const body: BusinessSearchResult = { items, page, pageSize, total: items.length };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

async function renderPage(node: Promise<React.ReactElement>) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider initialLocale="en">{await node}</LanguageProvider>
    </QueryClientProvider>,
  );
}

describe('discovery search', () => {
  it('updates the grid once a filter change resolves, without navigating', async () => {
    await renderPage(HomePage({ searchParams: Promise.resolve({}), params: Promise.resolve({}) }) as Promise<React.ReactElement>);

    expect(screen.getByText('Studio Zohar')).toBeInTheDocument();
    expect(screen.getByText('Glow Clinic')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'glow' } });

    await waitFor(() => expect(screen.queryByText('Studio Zohar')).not.toBeInTheDocument());
    expect(screen.getByText('Glow Clinic')).toBeInTheDocument();
  });

  it('matches a business by the name of someone who works there (§12.22)', async () => {
    await renderPage(HomePage({ searchParams: Promise.resolve({}), params: Promise.resolve({}) }) as Promise<React.ReactElement>);

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zohar levi' } });

    await waitFor(() => expect(screen.queryByText('Glow Clinic')).not.toBeInTheDocument());
    expect(screen.getByText('Studio Zohar')).toBeInTheDocument();
  });

  it('shows the "no match" wording only once a search excluded everything', async () => {
    await renderPage(HomePage({ searchParams: Promise.resolve({}), params: Promise.resolve({}) }) as Promise<React.ReactElement>);

    expect(screen.queryByText(copy.emptyState.noMatchesTitle)).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nothing-matches-this' } });

    await waitFor(() => expect(screen.getByText(copy.emptyState.noMatchesTitle)).toBeInTheDocument());
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
    await waitFor(() => expect(screen.getByText('Studio Zohar')).toBeInTheDocument());
  });
});
