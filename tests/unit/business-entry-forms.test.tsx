import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CreateBusinessForm } from '@/components/business/create-business-form';
import { JoinBusinessForm } from '@/components/business/join-business-form';
import { businessEntryRepository } from '@/lib/business-entry/repository';
import { LanguageProvider } from '@/lib/i18n/language-provider';

// Skipped: CreateBusinessForm/JoinBusinessForm are typecheck-only placeholders (CLAUDE.md §8).
// Remove .skip once the real business-entry forms are implemented.
describe.skip('business-entry demo forms', () => {
  it('validates required create fields locally before displaying demo success', async () => {
    const [categories, areas] = await Promise.all([
      businessEntryRepository.listCategories(),
      businessEntryRepository.listAreas(),
    ]);
    render(<LanguageProvider initialLocale="en"><CreateBusinessForm categories={categories} areas={areas} onComplete={() => undefined} /></LanguageProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Create in demo' }));
    expect(screen.getAllByText('This field is required')).not.toHaveLength(0);

    fireEvent.change(screen.getByLabelText('Business name'), { target: { value: 'My Studio' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: categories[0].id } });
    fireEvent.change(screen.getByLabelText('City / area'), { target: { value: areas[0].id } });
    fireEvent.change(screen.getByLabelText('Business address'), { target: { value: '1 Example Street' } });
    fireEvent.change(screen.getByLabelText('Business phone'), { target: { value: '050-0000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create in demo' }));

    expect(screen.getByText('No business was created and no information was saved. This form will later connect to secure business creation.')).toBeInTheDocument();
  });

  it('keeps join submission local and displays its pending demo state', async () => {
    const businesses = await businessEntryRepository.listJoinableBusinesses();
    render(<LanguageProvider initialLocale="en"><JoinBusinessForm businesses={businesses} /></LanguageProvider>);

    fireEvent.click(screen.getByRole('button', { name: /Studio Zohar/i }));
    fireEvent.change(screen.getByLabelText('Position / role title'), { target: { value: 'Hair stylist' } });
    fireEvent.change(screen.getByLabelText('Contact phone'), { target: { value: '050-0000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit in demo' }));

    expect(screen.getByText('Request marked pending in demo')).toBeInTheDocument();
    expect(screen.getByText(/No real request was sent and no information was saved/)).toBeInTheDocument();
  });
});
