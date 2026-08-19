'use client';

import {
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  MapPin,
  Phone,
  Scissors,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { actionButton, actionButtonChip, actionButtonSelected } from '@/components/common/button-styles';
import { PanelHero } from '@/components/common/panel-hero';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { DashboardBusiness, DashboardNavCounts } from '@/types/domain';

/**
 * The business dashboard's header: who this business is, and the way into each of its sections.
 *
 * It is a `PanelHero` rather than its own dark panel — same gradient, radius and type scale as
 * "העסקים שלי" and "התורים שלי" — with the business photo standing in for the section icon and the
 * category as the title's badge. The section links reuse the filter-chip treatment from
 * `MyBusinessesPage`: one blue for every control, selection carried by a ring rather than a second
 * colour (`components/common/button-styles.ts`).
 *
 * The dashboard has no `businessId` in its URL, so there is nothing to interpolate into the hrefs —
 * which business is being managed comes from the caller's own ACTIVE `employees` row
 * (`getCurrentEmployment()`).
 */
export function DashboardHeader({
  business,
  counts,
}: {
  business: DashboardBusiness;
  counts: DashboardNavCounts;
}) {
  const { copy } = useLanguage();
  const pathname = usePathname();

  const sections: { href: string; label: string; icon: LucideIcon; count?: number }[] = [
    {
      href: '/dashboard/appointments',
      label: copy.dashboard.nav.appointments,
      icon: CalendarDays,
      count: counts.appointmentsToday,
    },
    { href: '/dashboard/staff', label: copy.dashboard.nav.staff, icon: Users, count: counts.activeStaff },
    {
      href: '/dashboard/services',
      label: copy.dashboard.nav.services,
      icon: Scissors,
      count: counts.activeServices,
    },
    // No badge, like the settings link: opening hours and shift windows are a *configuration*, so
    // a number here would not answer "how much is waiting for me" the way the other four do.
    { href: '/dashboard/hours', label: copy.dashboard.nav.hours, icon: CalendarClock },
    { href: '/dashboard/waitlist', label: copy.dashboard.nav.waitlist, icon: Bell, count: counts.openWaitlist },
    { href: '/dashboard/details', label: copy.dashboard.nav.settings, icon: Settings },
  ];

  return (
    <PanelHero
      title={business.name}
      badge={business.categoryName || undefined}
      media={<BusinessPhoto photoUrl={business.photoUrl} />}
      description={
        <span className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 shrink-0 text-[#a8b0ff]" aria-hidden="true" />
            {[business.address, business.area].filter(Boolean).join(', ')}
          </span>
          <span className="flex items-center gap-1.5">
            <Phone className="h-4 w-4 shrink-0 text-[#a8b0ff]" aria-hidden="true" />
            {business.phone}
          </span>
          {business.status !== 'ACTIVE' ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
              {copy.dashboard.suspendedBadge}
            </span>
          ) : null}
        </span>
      }
    >
      <nav aria-label={copy.dashboard.nav.label} className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {sections.map((section) => {
          // Exact match only: `/dashboard` itself is the overview, and a prefix test would light up
          // every section at once from there.
          const isActive = pathname === section.href;

          return (
            <Link
              key={section.href}
              href={section.href}
              aria-current={isActive ? 'page' : undefined}
              className={`${actionButton} ${actionButtonChip} ${isActive ? actionButtonSelected : ''}`}
            >
              <section.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {section.label}
              {section.count === undefined ? null : (
                <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-xs">{section.count}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </PanelHero>
  );
}

/** The photo badge, shaped like the `PanelHero` icon badge it replaces — same size, border and radius. */
function BusinessPhoto({ photoUrl }: { photoUrl: string }) {
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#7169ef] bg-[#4237aa] text-[#a8b0ff] shadow-inner">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Storage host isn't in next.config's remotePatterns (§8, business-card.tsx)
        <img src={photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <Building2 className="h-7 w-7" aria-hidden="true" />
      )}
    </span>
  );
}
