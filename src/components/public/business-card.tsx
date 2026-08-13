'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { BusinessSummary, Category } from '@/types/domain';

export function BusinessCard({ business, category }: { business: BusinessSummary; category?: Category }) {
  const { copy, locale, direction } = useLanguage();
  const ForwardArrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <Link
      href={`/b/${business.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white transition-all duration-200 hover:z-10 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-[var(--soft-violet)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- mock photo host isn't in next.config's image remotePatterns */}
        <img
          src={business.photoUrl}
          alt={business.name[locale]}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {category ? (
          <span className="-mt-8 w-fit rounded-full bg-[var(--brand)] px-3 py-1 text-xs font-semibold text-white shadow-sm">
            {category.name[locale]}
          </span>
        ) : null}

        <h3 className="text-lg font-bold text-[var(--foreground)]">{business.name[locale]}</h3>
        <p className="line-clamp-2 text-sm text-[var(--muted)]">{business.description[locale]}</p>

        <p className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          {business.address[locale]}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-[var(--line)] pt-3">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-[var(--brand)]">
            {copy.discovery.bookAction}
            <ForwardArrow className="h-4 w-4" aria-hidden="true" />
          </span>

          <span className="flex items-center gap-2 text-xs text-[var(--muted)]">
            {business.employeeCount} {copy.discovery.staffCount}
            <span className="flex -space-x-2 rtl:space-x-reverse">
              {business.employeeAvatarUrls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element -- mock photo host isn't in next.config's image remotePatterns
                <img
                  key={url}
                  src={url}
                  alt=""
                  className="h-6 w-6 rounded-full border-2 border-white object-cover"
                />
              ))}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
