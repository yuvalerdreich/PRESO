import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PublicHeader } from '@/components/common/public-header';
import { appointmentsRepository } from '@/lib/appointments/repository';
import { LanguageProvider } from '@/lib/i18n/language-provider';

describe('public header', () => {
  it('links clients to the business-entry onboarding route', async () => {
    const [appointments, waitlistEntries] = await Promise.all([
      appointmentsRepository.listCurrentClientAppointments(),
      appointmentsRepository.listCurrentClientWaitlistEntries(),
    ]);
    render(<LanguageProvider initialLocale="en"><PublicHeader appointments={appointments} waitlistEntries={waitlistEntries} /></LanguageProvider>);

    expect(screen.getAllByRole('link', { name: 'For businesses' })[0]).toHaveAttribute('href', '/onboarding');
    expect(screen.getAllByRole('link', { name: 'Business dashboard' })[0]).toHaveAttribute('href', '/dashboard');
  });
});
