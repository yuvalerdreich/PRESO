import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refresh = vi.hoisted(() => vi.fn());
const create = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));
vi.mock('@/server/actions/business', () => ({
  createBusiness: create,
}));

import { CreateBusinessDialog } from '@/components/business/create-business-dialog';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import type { BusinessCategory } from '@/types/domain';

const categories: BusinessCategory[] = [{ id: 'cat-hair', slug: 'hair-beauty', name: 'Hair and beauty' }];

function renderDialog() {
  return render(
    <LanguageProvider initialLocale="en">
      <CreateBusinessDialog categories={categories} onClose={() => {}} />
    </LanguageProvider>,
  );
}

describe('open a business wizard', () => {
  beforeEach(() => {
    refresh.mockClear();
    create.mockClear();
  });

  it('offers the business photo while the business is being opened, not only afterwards', async () => {
    create.mockResolvedValueOnce({ ok: true, data: { businessId: 'b1', servicesCreated: 0 } });
    renderDialog();

    fireEvent.change(screen.getByLabelText(/Business name/i), { target: { value: 'Studio Zohar' } });
    fireEvent.change(screen.getByLabelText(/Business category/i), { target: { value: 'cat-hair' } });
    fireEvent.change(screen.getByLabelText(/City/i), { target: { value: 'Tel Aviv' } });
    fireEvent.change(screen.getByLabelText(/Business address/i), { target: { value: '142 Dizengoff' } });
    fireEvent.change(screen.getByLabelText(/Business phone/i), { target: { value: '03-1112222' } });
    fireEvent.change(screen.getByLabelText(/Business photo link/i), {
      target: { value: 'https://images.example.com/a.jpg' },
    });

    fireEvent.submit(screen.getByRole('dialog').querySelector('form')!);

    // It rides inside `create_business_with_owner()` — §6.8 rule 3 makes opening a business one
    // transaction, so the photo is part of the create payload rather than a follow-up save.
    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Studio Zohar',
          photoUrl: 'https://images.example.com/a.jpg',
        }),
      ),
    );
  });
});
