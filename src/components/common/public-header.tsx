'use client';

import { CalendarDays } from 'lucide-react';
import Link from 'next/link';

import { useAppointmentsPanel } from '@/components/common/appointments-panel-context';
import { PresoLogo } from '@/components/common/preso-logo';
import { countUpcomingAppointments } from '@/lib/appointments/classify';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { ClientAppointment } from '@/types/appointments';

export function PublicHeader({ appointments }: { appointments: ClientAppointment[] }) {
  const { copy } = useLanguage();
  const { open } = useAppointmentsPanel();
  const upcomingCount = countUpcomingAppointments(appointments);

  return (
    <header className="border-b border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <PresoLogo />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={open}
            aria-label={copy.header.openAppointments}
            className="flex items-center gap-2 rounded-full border border-[var(--brand)]/20 bg-[var(--soft-violet)] px-4 py-2 text-sm font-medium text-[var(--brand-deep)] transition-colors hover:bg-[var(--brand)]/10"
          >
            <span>{copy.header.appointments}</span>
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
            {upcomingCount > 0 ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-semibold text-white">
                {upcomingCount}
              </span>
            ) : null}
          </button>

          <Link
            href="/login"
            className="rounded-full px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--soft-violet)]"
          >
            {copy.header.signIn}
          </Link>
        </div>
      </div>
    </header>
  );
}
