import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ClientAppointmentsPage from '@/app/(public)/me/appointments/page';
import { LanguageProvider } from '@/lib/i18n/language-provider';

describe('client appointments page', () => {
  it('renders the shared appointments panel on the route', async () => {
    render(
      <LanguageProvider initialLocale="en">
        {await ClientAppointmentsPage()}
      </LanguageProvider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'My appointments and requests' })).toBeInTheDocument();
  });
});
