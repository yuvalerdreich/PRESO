'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Building2, MapPin } from 'lucide-react';

import { actionButton } from '@/components/common/button-styles';
import { ErrorDialog } from '@/components/common/error-dialog';
import {
  cardAction,
  cardChip,
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
  const notice = copy.businessProfile.ownBusiness;

  // §12.55/§12.56 — your own business answers on *this* screen. The card still carries its usual
  // action, because a card that silently behaves differently teaches nothing; pressing it explains
  // why, next to the business it is talking about, rather than on a page that has left the grid.
  const [blocked, setBlocked] = useState(false);

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
        {/* `relative` is load-bearing, not styling. The chips are *meant* to straddle the photo's
            bottom edge (`-mt-7`), but a non-positioned element loses that overlap: CSS paints a
            replaced element's content (the <img>) in a later phase than a following sibling's
            background, so the photo drew over the top half of both chips even though they come
            after it in the DOM. `relative` moves the row into the positioned-descendants phase,
            which paints last. No `z-10` on purpose — that would lift the chips above the booking
            link's `cardStretchedLink` ::after and punch two dead spots in the card's hit area;
            plain `relative` paints above the photo while staying below the ::after, which comes
            later in tree order. */}
        <div className="relative -mt-7 flex flex-wrap items-center gap-2">
          {category ? <span className={cardChipBrand}>{category.name[locale]}</span> : null}
          {/* §12.55 — a business you own or work at is marked before you open it, so the refusal
              on the other side is expected rather than a surprise. */}
          {business.viewerRelation ? (
            <span className={`${cardChip} bg-emerald-500 text-white shadow-sm`}>{copy.discovery.yourBusiness}</span>
          ) : null}
        </div>

        <h3 className={cardTitle}>{business.name}</h3>
        <p className="line-clamp-2 text-sm leading-5 text-[var(--muted)]">{business.description}</p>

        <p className={cardMetaRow}>
          <MapPin className={cardMetaIcon} aria-hidden="true" />
          <span className="truncate">{business.address}</span>
        </p>

        {/* Staff count and avatars used to sit opposite the action here. Removed by request: the
            grid is a list of *businesses*, and who works there is the business page's answer. */}
        <div className="mt-auto flex border-t border-[var(--line)] pt-3">
          {business.viewerRelation ? (
            <button
              type="button"
              onClick={() => setBlocked(true)}
              // Same accessible name as the link it replaces: what it *offers* is unchanged, and
              // the difference is the answer, not the affordance.
              aria-label={`${copy.discovery.bookAction} — ${business.name}`}
              className={`${actionButton} ${cardAction} ${cardStretchedLink} cursor-pointer`}
            >
              {copy.discovery.bookAction}
              <ForwardArrow className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
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
          )}
        </div>
      </div>

      {blocked && business.viewerRelation ? (
        <ErrorDialog
          title={notice.title}
          description={(business.viewerRelation === 'OWNER'
            ? notice.descriptionOwner
            : notice.descriptionStaff
          ).replace('{business}', business.name)}
          action={{
            href: '/businesses',
            label: notice.goToMyBusinesses,
            icon: <Building2 className="h-4 w-4" aria-hidden="true" />,
          }}
          onClose={() => setBlocked(false)}
        />
      ) : null}
    </article>
  );
}
