'use client';

import { BriefcaseBusiness, CalendarDays, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { Database } from '@/types/database.types';

type AccountSidebarProps = {
  accountType: Database['public']['Enums']['account_type'];
};

export function AccountSidebar({ accountType }: AccountSidebarProps) {
  const pathname = usePathname();
  const { copy } = useLanguage();
  const navigationItems = [
    { href: '/', icon: Home, label: copy.accountSidebar.home },
    { href: '/me/appointments', icon: CalendarDays, label: copy.accountSidebar.appointments },
    ...(accountType === 'BUSINESS'
      ? [{ href: '/dashboard', icon: BriefcaseBusiness, label: copy.accountSidebar.businesses }]
      : []),
  ];

  return (
    <aside className="shrink-0 border-b border-[var(--line)] bg-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-72 lg:flex-col lg:border-b-0 lg:border-e">
      <div className="hidden border-b border-[var(--line)] px-6 py-7 lg:block">
        <span className="block text-lg font-bold text-[var(--brand)]">{copy.brand.name}</span>
        <span className="block text-xs text-[var(--muted)]">{copy.accountSidebar.navigationLabel}</span>
      </div>

      <nav
        aria-label={copy.accountSidebar.navigationLabel}
        className="flex gap-2 overflow-x-auto px-3 py-3 lg:flex-col lg:overflow-visible lg:px-5 lg:py-5"
      >
        {navigationItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors lg:w-full ${
                isActive
                  ? 'bg-[var(--brand)] text-white shadow-md shadow-[var(--brand)]/20'
                  : 'text-[var(--muted)] hover:bg-[var(--soft-violet)] hover:text-[var(--brand-deep)]'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
