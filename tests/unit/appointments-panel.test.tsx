import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppointmentsPanel } from '@/components/client/appointments-panel';
import { appointmentsRepository } from '@/lib/appointments/repository';
import { LanguageProvider } from '@/lib/i18n/language-provider';

describe('appointments panel', () => {
  it('shows appointment tabs and keeps cancellation local to the panel', async () => {
    const [appointments, waitlistEntries] = await Promise.all([
      appointmentsRepository.listCurrentClientAppointments(),
      appointmentsRepository.listCurrentClientWaitlistEntries(),
    ]);
    render(
      <LanguageProvider initialLocale="en">
        <AppointmentsPanel appointments={appointments} waitlistEntries={waitlistEntries} />
      </LanguageProvider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'My appointments and requests' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /waitlist/i }));
    expect(screen.getByText(/Soft highlights · Noa Golan/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /upcoming/i }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel appointment' })[0]);
    expect(screen.getByRole('dialog', { name: 'Cancel this appointment?' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Cancel appointment' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel in demo' }));

    expect(screen.getByRole('tab', { name: /history\s*2/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Cancelled in demo only')).toBeInTheDocument();
  });
});
