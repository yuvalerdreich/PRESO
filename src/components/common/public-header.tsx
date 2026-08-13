'use client';

import Link from 'next/link';
import { Building2, CalendarDays, Search, ShieldCheck, UsersRound, Wrench } from 'lucide-react';
import { usePathname } from 'next/navigation';

import { LanguageSwitcher } from '@/components/common/language-switcher';
import { PresoLogo } from '@/components/common/preso-logo';
import { useLanguage } from '@/lib/i18n/language-provider';

type ProductArea = 'customer' | 'business' | 'admin';

function getActiveArea(pathname: string): ProductArea {
  if (pathname.startsWith('/dashboard') || pathname === '/onboarding' || pathname === '/join') return 'business';
  return 'customer';
}

function NavigationItem({
  href,
  icon: Icon,
  label,
  active = false,
}: {
  href: string;
  icon: typeof Search;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] ${
        active
          ? 'bg-white text-[var(--brand)] shadow-[0_2px_8px_rgba(37,34,99,.10)]'
          : 'text-[var(--muted)] hover:bg-white/80 hover:text-[var(--brand)]'
      }`}
    >
      <Icon aria-hidden="true" size={14} />
      {label}
    </Link>
  );
}

function DisabledNavigationItem({ icon: Icon, label }: { icon: typeof Search; label: string }) {
  return (
    <span
      aria-disabled="true"
      title={label}
      className="inline-flex min-h-9 shrink-0 cursor-not-allowed items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-slate-400"
    >
      <Icon aria-hidden="true" size={14} />
      {label}
    </span>
  );
}

export function PublicHeader() {
  const { copy } = useLanguage();
  const pathname = usePathname() ?? '/';
  const activeArea = getActiveArea(pathname);

  const isCustomerSearch = pathname === '/' || pathname === '/search' || pathname.startsWith('/b/');
  const isBusinessDashboard = pathname === '/dashboard';
  const isBusinessAppointments = pathname === '/dashboard/appointments';
  const isBusinessServices = pathname === '/dashboard/services';

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white/95 shadow-[0_1px_0_rgba(37,34,99,.04)] backdrop-blur-xl">
      <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex min-h-11 items-center justify-between gap-3">
          <PresoLogo />
          <div className="flex items-center gap-2">
            <Link
              href="/onboarding"
              className="hidden min-h-10 items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 text-sm font-bold text-[var(--brand)] transition hover:-translate-y-0.5 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] sm:inline-flex"
            >
              <Building2 aria-hidden="true" size={16} />
              {copy.header.businessEntry}
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 px-3 text-[var(--brand)] shadow-sm transition hover:-translate-y-0.5 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] sm:hidden"
            >
              <Building2 aria-hidden="true" size={16} />
              <span className="sr-only">{copy.header.businessEntry}</span>
            </Link>
            <LanguageSwitcher />
          </div>
        </div>

        <nav className="mt-3 flex gap-1 overflow-x-auto rounded-2xl border border-[#e8e8f2] bg-[#f7f7fb] p-1.5 [scrollbar-width:none]" aria-label={copy.header.productAreas}>
          <Link
            href="/"
            aria-label={`${copy.header.customerArea} ${copy.header.customerAreaDetail}`}
            aria-current={activeArea === 'customer' ? 'page' : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] sm:text-sm ${
              activeArea === 'customer'
                ? 'bg-[var(--brand)] text-white shadow-[0_5px_14px_rgba(82,56,247,.28)]'
                : 'text-[var(--foreground)] hover:bg-white hover:text-[var(--brand)]'
            }`}
          >
            <UsersRound aria-hidden="true" size={16} />
            <span>{copy.header.customerArea}</span>
            <span className="hidden text-[11px] font-medium opacity-80 lg:inline"> {copy.header.customerAreaDetail}</span>
          </Link>
          <Link
            href="/dashboard"
            aria-current={activeArea === 'business' ? 'page' : undefined}
            className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] sm:text-sm ${
              activeArea === 'business'
                ? 'bg-[var(--brand)] text-white shadow-[0_5px_14px_rgba(82,56,247,.28)]'
                : 'text-[var(--foreground)] hover:bg-white hover:text-[var(--brand)]'
            }`}
          >
            <Building2 aria-hidden="true" size={16} />
            <span>{copy.header.businessPortal}</span>
          </Link>
          <span
            aria-disabled="true"
            title={copy.header.adminUnavailable}
            className="inline-flex min-h-11 shrink-0 cursor-not-allowed items-center gap-2 rounded-xl px-3.5 text-xs font-bold text-slate-400 sm:text-sm"
          >
            <ShieldCheck aria-hidden="true" size={16} />
            <span>{copy.header.adminArea}</span>
            <span className="hidden text-[11px] font-medium lg:inline">{copy.header.adminDetail}</span>
          </span>
        </nav>

        <nav className="mt-2 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none]" aria-label={copy.header.contextualNavigation}>
          {activeArea === 'customer' ? (
            <>
              <NavigationItem href="/" icon={Search} label={copy.header.businessSearch} active={isCustomerSearch} />
              <DisabledNavigationItem icon={CalendarDays} label={copy.header.booking} />
              <NavigationItem href="/me/appointments" icon={CalendarDays} label={copy.header.appointments} active={pathname === '/me/appointments'} />
            </>
          ) : (
            <>
              <NavigationItem href="/dashboard" icon={Building2} label={copy.header.businessDashboard} active={isBusinessDashboard} />
              <NavigationItem href="/dashboard/appointments" icon={CalendarDays} label={copy.header.businessAppointments} active={isBusinessAppointments} />
              <DisabledNavigationItem icon={UsersRound} label={copy.header.staff} />
              <NavigationItem href="/dashboard/services" icon={Wrench} label={copy.header.services} active={isBusinessServices} />
              <DisabledNavigationItem icon={CalendarDays} label={copy.header.availability} />
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
