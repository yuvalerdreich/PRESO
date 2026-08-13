import type { ReactNode } from 'react';

import { PublicHeader } from '@/components/common/public-header';
import { appointmentsRepository } from '@/lib/appointments/repository';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [appointments, waitlistEntries] = await Promise.all([
    appointmentsRepository.listCurrentClientAppointments(),
    appointmentsRepository.listCurrentClientWaitlistEntries(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader appointments={appointments} waitlistEntries={waitlistEntries} />
      {children}
    </div>
  );
}
