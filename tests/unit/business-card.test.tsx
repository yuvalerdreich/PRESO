import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BusinessCard } from '@/components/public/business-card';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import type { BusinessSummary, Category } from '@/types/domain';

const business: BusinessSummary = {
  id: 'business-zohar',
  name: 'Studio Zohar',
  description: 'Gel nails and brow design',
  categoryId: 'cat-1',
  area: 'Tel Aviv',
  address: '142 Dizengoff Street',
  photoUrl: '',
  employeeCount: 2,
  employeeAvatarUrls: [],
  employeeNames: ['Zohar Levi'],
  approvalPolicy: 'AUTO',
};

const category: Category = {
  id: 'cat-1',
  slug: 'hair-beauty',
  icon: 'scissors',
  name: { he: 'מספרות', en: 'Hair and beauty' },
};

function renderCard() {
  return render(
    <LanguageProvider initialLocale="en">
      <BusinessCard business={business} category={category} />
    </LanguageProvider>,
  );
}

describe('discovery business card', () => {
  it('books through a single named link, styled as the app’s action button', () => {
    renderCard();

    // One link, not a card-wide anchor plus a nested one: the pill *is* the card's hit area
    // (`cardStretchedLink`), which is what let the call to action become a real button.
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);

    const book = screen.getByRole('link', { name: 'Book appointment — Studio Zohar' });
    expect(book).toHaveAttribute('href', '/b/business-zohar');
    expect(book.className).toContain('bg-[var(--brand-blue-dark)]');
  });

  it('shows the business, its category and where it is — and not who works there', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Studio Zohar' })).toBeInTheDocument();
    expect(screen.getByText('Hair and beauty')).toBeInTheDocument();
    expect(screen.getByText('142 Dizengoff Street')).toBeInTheDocument();
    // Staff count and avatars were removed by request — the business page answers who works there.
    expect(screen.queryByText(/staff members/i)).not.toBeInTheDocument();
  });
});
