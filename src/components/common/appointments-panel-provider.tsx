'use client';

import { useState, type ReactNode } from 'react';

import { AppointmentsPanelContext } from '@/components/common/appointments-panel-context';
import { AppointmentsPanel } from '@/components/client/appointments-panel';
import { Modal } from '@/components/common/modal';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { ClientAppointment, ClientWaitlistEntry } from '@/types/appointments';

/**
 * Shares the "My appointments" modal across the sidebar nav item and the
 * booking thank-you screen's "view my appointments" action. Both open it in place
 * rather than navigating to /me/appointments, which requires a real session
 * proxy.ts already enforces — no (auth)/login page exists yet to satisfy it
 * (TECHNICAL_DESIGN.md §12, tracked until real auth lands).
 */
export function AppointmentsPanelProvider({
  appointments,
  waitlistEntries,
  children,
}: {
  appointments: ClientAppointment[];
  waitlistEntries: ClientWaitlistEntry[];
  children: ReactNode;
}) {
  const { copy } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AppointmentsPanelContext.Provider value={{ open: () => setIsOpen(true), isOpen }}>
      {children}

      {isOpen ? (
        <Modal onClose={() => setIsOpen(false)} closeLabel={copy.appointments.close}>
          <AppointmentsPanel appointments={appointments} waitlistEntries={waitlistEntries} />
        </Modal>
      ) : null}
    </AppointmentsPanelContext.Provider>
  );
}
