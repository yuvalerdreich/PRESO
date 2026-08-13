import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PublicHeader } from '@/components/common/public-header';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import { translations } from '@/lib/i18n/translations';

describe('public header', () => {
  it('renders the brand mark and a My Appointments link with an upcoming-count badge', () => {
    render(
      <LanguageProvider initialLocale="en">
        <PublicHeader />
      </LanguageProvider>,
    );

    expect(screen.getByText(translations.en.brand.name)).toBeInTheDocument();
    expect(screen.getByText(translations.en.header.subtitle)).toBeInTheDocument();

    const appointmentsLink = screen.getByRole('link', { name: translations.en.header.openAppointments });
    expect(appointmentsLink).toHaveAttribute('href', '/me/appointments');
    expect(screen.getByText(translations.en.header.appointments)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
