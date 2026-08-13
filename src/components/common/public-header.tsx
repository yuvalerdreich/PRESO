'use client';

import Link from 'next/link';
import { CalendarDays } from 'lucide-react';

import { PresoLogo } from '@/components/common/preso-logo';
import { useLanguage } from '@/lib/i18n/language-provider';

/**
 * Mock badge count until `/me/appointments` is wired to the real appointments
 * repository — matches the "1" shown in the client home mock.
 */
const MOCK_UPCOMING_APPOINTMENTS = 1;

export function PublicHeader() {
  const { copy } = useLanguage();

  return (
    <header className="border-b border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <PresoLogo />

        <Link
          href="/me/appointments"
          aria-label={copy.header.openAppointments}
          className="flex items-center gap-2 rounded-full border border-[var(--brand)]/20 bg-[var(--soft-violet)] px-4 py-2 text-sm font-medium text-[var(--brand-deep)] transition-colors hover:bg-[var(--brand)]/10"
        >
          <span>{copy.header.appointments}</span>
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {MOCK_UPCOMING_APPOINTMENTS > 0 ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-semibold text-white">
              {MOCK_UPCOMING_APPOINTMENTS}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
