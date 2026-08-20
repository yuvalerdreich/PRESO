'use client';

import { Building2, CalendarDays, Home, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { countUpcomingAppointments } from '@/lib/appointments/classify';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { ClientAppointment } from '@/types/domain';
import type { Database } from '@/types/database.types';

type AccountType = Database['public']['Enums']['account_type'];

/**
 * The primary navigation menu. A CLIENT sees exactly two entries — home and
 * "my appointments"; a BUSINESS account additionally gets its dashboard.
 * "My appointments" is a button, not a link: it opens the shared
 * AppointmentsPanel modal in place, the same surface the booking thank-you
 * screen opens (TECHNICAL_DESIGN.md §12.33).
 */
export function AccountSidebar({
  appointments,
  accountType = 'CLIENT',
}: {
  appointments: ClientAppointment[];
  accountType?: AccountType;
}) {
  const { copy } = useLanguage();
  const pathname = usePathname();
  const upcomingCount = countUpcomingAppointments(appointments);
  const appointmentsActive = pathname === '/me/appointments';
  // Managing a business happens *inside* "my businesses" (`/businesses/manage/**`), so the entry
  // stays lit the whole time you are in there — a prefix, not an exact match. Leaving it dark made
  // the portal look like a place outside the site's own navigation.
  const businessesActive = pathname === '/businesses' || pathname.startsWith('/businesses/');

  // The aside is always a side column — it never stacks above the content at
  // narrow widths (devtools open, small viewport); it scrolls internally instead.
  return (
    <aside className="sticky top-0 h-dvh w-56 shrink-0 overflow-y-auto border-e border-[var(--line)] bg-[var(--surface)] sm:w-64 lg:w-72">
      <nav aria-label={copy.sidebar.title} className="flex flex-col gap-2 px-3 py-6 sm:px-4">
        <span className="px-4 pb-1 text-xs font-medium text-[var(--muted)]">{copy.sidebar.title}</span>

        <Link
          href="/"
          aria-current={pathname === '/' ? 'page' : undefined}
          className={itemClassName(pathname === '/')}
        >
          <ItemIcon icon={Home} isActive={pathname === '/'} />
          <span>{copy.sidebar.home}</span>
        </Link>

        <Link
          href="/me/appointments"
          aria-current={appointmentsActive ? 'page' : undefined}
          aria-label={copy.sidebar.openAppointments}
          className={itemClassName(appointmentsActive)}
        >
          <ItemIcon icon={CalendarDays} isActive={appointmentsActive} />
          <span>{copy.sidebar.appointments}</span>
          {upcomingCount > 0 ? (
            <span
              className={`ms-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                appointmentsActive ? 'bg-white text-[var(--brand)]' : 'bg-[var(--brand)] text-white'
              }`}
            >
              {upcomingCount}
            </span>
          ) : null}
        </Link>

        {accountType === 'BUSINESS' ? (
          <>
            <Link
              href="/businesses"
              aria-current={businessesActive ? 'page' : undefined}
              className={itemClassName(businessesActive)}
            >
              <ItemIcon icon={Building2} isActive={businessesActive} />
              <span>{copy.sidebar.myBusinesses}</span>
            </Link>

          </>
        ) : null}
      </nav>
    </aside>
  );
}

function itemClassName(isActive: boolean) {
  return `flex w-full items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold transition-colors ${
    isActive
      ? 'bg-[var(--brand)] text-white shadow-sm shadow-[var(--brand)]/30'
      : 'text-[var(--foreground)] hover:bg-[var(--soft-violet)]'
  }`;
}

function ItemIcon({ icon: Icon, isActive }: { icon: LucideIcon; isActive: boolean }) {
  return (
    <Icon
      className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-[var(--muted)]'}`}
      aria-hidden="true"
    />
  );
}
