'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';

import { actionButton } from '@/components/common/button-styles';
import {
  cardAction,
  cardChipBrand,
  cardMetaIcon,
  cardMetaRow,
  cardStretchedLink,
  cardTitle,
  surfaceCardInteractive,
} from '@/components/common/card-styles';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { BusinessSummary, Category } from '@/types/domain';

/**
 * A business in the discovery grid.
 *
 * The card is an `<article>` whose booking pill is the only link, stretched over the whole card
 * (`cardStretchedLink`) — it used to be a `<Link>` wrapping everything, which is why the call to
 * action could only ever be text-and-arrow rather than the app's button. It is now the same filled
 * pill as "ניהול העסק" on `/businesses`, and the shell, title and meta rows are the same shared
 * card treatment as well, so a business looks like a business on either screen.
 */
export function BusinessCard({ business, category }: { business: BusinessSummary; category?: Category }) {
  const { copy, locale, direction } = useLanguage();
  const ForwardArrow = direction === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <article className={surfaceCardInteractive}>
      <div className="aspect-[16/10] w-full overflow-hidden bg-[var(--soft-violet)]">
        {/* A business with no uploaded photo resolves to '' (server/queries/shared.ts's
            resolvePhotoUrl), and <img src=""> makes the browser re-request the page itself —
            leave the tinted container as the placeholder instead. */}
        {business.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- mock photo host isn't in next.config's image remotePatterns
          <img
            src={business.photoUrl}
            alt={business.name}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {category ? <span className={`${cardChipBrand} -mt-7`}>{category.name[locale]}</span> : null}

        <h3 className={cardTitle}>{business.name}</h3>
        <p className="line-clamp-2 text-sm leading-5 text-[var(--muted)]">{business.description}</p>

        <p className={cardMetaRow}>
          <MapPin className={cardMetaIcon} aria-hidden="true" />
          <span className="truncate">{business.address}</span>
        </p>

        {/* Staff count and avatars used to sit opposite the action here. Removed by request: the
            grid is a list of *businesses*, and who works there is the business page's answer. */}
        <div className="mt-auto flex border-t border-[var(--line)] pt-3">
          <Link
            href={`/b/${business.id}`}
            // The card carries no other link, so the accessible name has to say *which* business
            // this books — "Book appointment" repeated down the grid names nothing.
            aria-label={`${copy.discovery.bookAction} — ${business.name}`}
            className={`${actionButton} ${cardAction} ${cardStretchedLink}`}
          >
            {copy.discovery.bookAction}
            <ForwardArrow className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
