import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refresh = vi.hoisted(() => vi.fn());
const save = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));
vi.mock('@/server/actions/business', () => ({
  updateBusinessDetails: save,
}));

import { DashboardDetailsPage } from '@/components/business/dashboard-details-page';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import type { BusinessCategory, DashboardBusiness } from '@/types/domain';

const categories: BusinessCategory[] = [
  { id: 'cat-hair', slug: 'hair-beauty', name: 'Hair and beauty' },
  { id: 'cat-clinic', slug: 'health-clinics', name: 'Clinics' },
];

const business: DashboardBusiness = {
  id: 'business-1',
  name: 'Studio Zohar',
  categoryId: 'cat-hair',
  categoryName: 'Hair and beauty',
  description: 'A calm studio.',
  address: '142 Dizengoff Street',
  area: 'Tel Aviv',
  phone: '054-1112233',
  photoUrl: 'https://images.example.com/a.jpg',
  photoRef: 'https://images.example.com/a.jpg',
  timezone: 'Asia/Jerusalem',
  approvalPolicy: 'AUTO',
  cancellationWindowHours: 4,
  paymentNotes: 'Cash or Bit.',
  bookingNotes: 'Up to 30 days ahead.',
  status: 'ACTIVE',
  isOwner: true,
};

function renderSettings(overrides: Partial<DashboardBusiness> = {}) {
  return render(
    <LanguageProvider initialLocale="en">
      <DashboardDetailsPage business={{ ...business, ...overrides }} categories={categories} />
    </LanguageProvider>,
  );
}

describe('business settings screen', () => {
  beforeEach(() => {
    refresh.mockClear();
    save.mockClear();
  });

  it('opens on what is stored, every field filled in', () => {
    renderSettings();

    expect(screen.getByDisplayValue('Studio Zohar')).toBeInTheDocument();
    expect(screen.getByDisplayValue('A calm studio.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Tel Aviv')).toBeInTheDocument();
    expect(screen.getByDisplayValue('142 Dizengoff Street')).toBeInTheDocument();
    expect(screen.getByDisplayValue('054-1112233')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://images.example.com/a.jpg')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Up to 30 days ahead.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cash or Bit.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('4')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Auto-approve/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('saves every group as one row, including the photo and both free-text policies', async () => {
    save.mockResolvedValueOnce({ ok: true, data: { businessId: business.id } });
    renderSettings();

    fireEvent.change(screen.getByDisplayValue('Studio Zohar'), { target: { value: 'Studio Zohar & Co' } });
    fireEvent.change(screen.getByDisplayValue('https://images.example.com/a.jpg'), {
      target: { value: 'https://images.example.com/b.jpg' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Manual approval/ }));
    fireEvent.click(screen.getByRole('button', { name: /Save business settings/ }));

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          businessId: business.id,
          name: 'Studio Zohar & Co',
          categoryId: 'cat-hair',
          photoUrl: 'https://images.example.com/b.jpg',
          approvalPolicy: 'MANUAL',
          cancellationWindowHours: '4',
          bookingNotes: 'Up to 30 days ahead.',
          paymentNotes: 'Cash or Bit.',
        }),
      ),
    );
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(await screen.findByRole('status')).toHaveTextContent('Business settings saved');
  });

  it('echoes the cancellation window back as the sentence clients are told', () => {
    renderSettings();

    fireEvent.change(screen.getByDisplayValue('4'), { target: { value: '12' } });

    expect(screen.getByText(/cancelled up to 12 hours ahead/)).toBeInTheDocument();
  });

  it('shows the field that was refused, not the generic validation line', async () => {
    save.mockResolvedValueOnce({
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Please correct the highlighted fields.',
        fields: { photoUrl: 'Enter a full image link (https://…) or a stored file path' },
      },
    });
    renderSettings();

    fireEvent.click(screen.getByRole('button', { name: /Save business settings/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a full image link');
    expect(refresh).not.toHaveBeenCalled();
  });

  it('names a share link for what it is, rather than showing an empty frame', () => {
    renderSettings();

    fireEvent.change(screen.getByDisplayValue('https://images.example.com/a.jpg'), {
      target: { value: 'https://share.google/ft2Zhxfupzcms665m' },
    });

    // The mistake is knowable from the host alone, so it is named before the load even fails.
    expect(screen.getByText(/not to an image file/i)).toBeInTheDocument();
    expect(screen.getByText(/Copy image address/i)).toBeInTheDocument();
  });

  it('tells a broken link apart from an empty field', () => {
    renderSettings({ photoRef: '', photoUrl: '' });

    // Empty is empty…
    expect(screen.getByText('No photo')).toBeInTheDocument();
    expect(screen.queryByText(/No image could be loaded/i)).not.toBeInTheDocument();

    // …and a link that will not load says so instead, in both the frame and in words.
    fireEvent.change(screen.getByPlaceholderText('https://…'), {
      target: { value: 'https://images.example.com/missing.jpg' },
    });
    fireEvent.error(screen.getByAltText('Business photo'));

    expect(screen.getByText('Link did not load')).toBeInTheDocument();
    expect(screen.getByText(/No image could be loaded/i)).toBeInTheDocument();
  });

  it('says a suspended business is suspended, without locking the form', () => {
    renderSettings({ status: 'SUSPENDED' });

    expect(screen.getByText(/currently suspended by the moderation team/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save business settings/ })).toBeEnabled();
  });
});
