import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppointmentsPanelProvider } from '@/components/common/appointments-panel-provider';
import { PublicHeader } from '@/components/common/public-header';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import { translations } from '@/lib/i18n/translations';
import type { ClientAppointment, ClientWaitlistEntry } from '@/types/appointments';

function appointment(overrides: Partial<ClientAppointment>): ClientAppointment {
  return {
    id: 'a',
    businessName: 'Studio Zohar - מספרת זוהר',
    employeeName: 'זוהר לוי',
    serviceName: 'תספורת',
    address: 'רחוב דיזנגוף 142, תל אביב',
    dateISO: '2999-01-01',
    time: '10:00',
    status: 'confirmed',
    ...overrides,
  };
}

describe('public header', () => {
  it('renders the brand mark and a My Appointments button with an upcoming-count badge that opens the panel', () => {
    const appointments = [appointment({ id: 'upcoming-1' })];
    const waitlistEntries: ClientWaitlistEntry[] = [];

    render(
      <LanguageProvider initialLocale="en">
        <AppointmentsPanelProvider appointments={appointments} waitlistEntries={waitlistEntries}>
          <PublicHeader appointments={appointments} />
        </AppointmentsPanelProvider>
      </LanguageProvider>,
    );

    expect(screen.getByText(translations.en.brand.name)).toBeInTheDocument();
    expect(screen.getByText(translations.en.header.subtitle)).toBeInTheDocument();

    const appointmentsButton = screen.getByRole('button', { name: translations.en.header.openAppointments });
    expect(screen.getByText(translations.en.header.appointments)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(appointmentsButton);
    expect(screen.getByRole('heading', { level: 1, name: translations.en.appointments.title })).toBeInTheDocument();
  });

  it('counts only future, non-cancelled appointments in the badge — never waitlist or past ones', () => {
    const appointments = [
      appointment({ id: 'upcoming', dateISO: '2999-01-01', status: 'confirmed' }),
      appointment({ id: 'upcoming-cancelled', dateISO: '2999-01-01', status: 'cancelled' }),
      appointment({ id: 'past', dateISO: '2000-01-01', status: 'confirmed' }),
    ];
    const glowClinic = 'Glow Clinic קליניקת אסתטיקה';
    const noaGolan = 'נועה גולן';
    const softHighlights = 'גוונים רכים';
    const waitlistEntries: ClientWaitlistEntry[] = [
      { id: 'w1', businessName: glowClinic, employeeName: noaGolan, serviceName: softHighlights, requestedDateISO: '2999-01-01', requestedRange: '' },
      { id: 'w2', businessName: glowClinic, employeeName: noaGolan, serviceName: softHighlights, requestedDateISO: '2999-01-01', requestedRange: '' },
    ];

    render(
      <LanguageProvider initialLocale="en">
        <AppointmentsPanelProvider appointments={appointments} waitlistEntries={waitlistEntries}>
          <PublicHeader appointments={appointments} />
        </AppointmentsPanelProvider>
      </LanguageProvider>,
    );

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.queryByText('2')).not.toBeInTheDocument();
    expect(screen.queryByText('3')).not.toBeInTheDocument();
  });

  it('hides the count badge entirely when there are no upcoming appointments', () => {
    render(
      <LanguageProvider initialLocale="en">
        <AppointmentsPanelProvider appointments={[]} waitlistEntries={[]}>
          <PublicHeader appointments={[]} />
        </AppointmentsPanelProvider>
      </LanguageProvider>,
    );

    const appointmentsButton = screen.getByRole('button', { name: translations.en.header.openAppointments });
    expect(appointmentsButton).not.toHaveTextContent('0');
  });
});
