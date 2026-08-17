'use client';

import { createContext, useContext } from 'react';

export const AppointmentsPanelContext = createContext<{ open: () => void; isOpen: boolean } | null>(
  null,
);

export function useAppointmentsPanel() {
  const context = useContext(AppointmentsPanelContext);
  if (!context) {
    throw new Error('useAppointmentsPanel must be used within an AppointmentsPanelProvider');
  }
  return context;
}
