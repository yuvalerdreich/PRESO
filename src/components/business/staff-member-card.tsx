'use client';

import { Mail, Phone, Scissors, UserRound } from 'lucide-react';

import {
  cardChip,
  cardChipBrand,
  cardHoverLift,
  cardMetaIcon,
  cardMetaList,
  cardMetaRow,
  cardSubtitle,
  cardTitle,
  surfaceCard,
} from '@/components/common/card-styles';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { DashboardEmployee } from '@/types/domain';

/**
 * One position on the roster: who holds it, what they are called here, and how to reach them.
 *
 * `employees` is a *position*, not a person-record (§3.6), which is why the name and the position
 * title are two separate lines rather than one — "יובל ארדריך" is the person, "בעל/ת העסק ומנהל/ת"
 * is the chair. A retired position (§6.9's soft retire) still lists, flagged, because it still
 * anchors past appointments.
 *
 * Phone and email come from `business_staff_contacts` (0021) and are null only when that view's
 * predicate excluded the caller — so "no phone provided" is a statement about the colleague's
 * profile, never about a missing column.
 */
export function StaffMemberCard({ employee }: { employee: DashboardEmployee }) {
  const { copy } = useLanguage();
  const isInactive = employee.status !== 'ACTIVE';

  return (
    <article className={`${surfaceCard} ${cardHoverLift} h-full gap-4 p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <StaffAvatar employee={employee} />
          <div className="min-w-0">
            <h3 className={cardTitle}>{employee.fullName}</h3>
            <p className={`mt-1 ${cardSubtitle}`}>
              {employee.isOwner ? copy.dashboard.staff.ownerRole : employee.positionTitle}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {employee.isOwner ? (
            <span className={`${cardChip} bg-[var(--soft-violet)] text-[var(--brand-deep)]`}>
              {copy.dashboard.staff.ownerBadge}
            </span>
          ) : (
            <span className={cardChipBrand}>{copy.dashboard.staff.staffRole}</span>
          )}
          {isInactive ? (
            <span className={`${cardChip} bg-slate-200 text-slate-600`}>
              {copy.dashboard.staff.inactiveBadge}
            </span>
          ) : null}
        </div>
      </div>

      <div className={cardMetaList}>
        <span className={cardMetaRow}>
          <Phone className={cardMetaIcon} aria-hidden="true" />
          {employee.phone ? (
            <a href={`tel:${employee.phone}`} className="font-semibold hover:underline">
              {employee.phone}
            </a>
          ) : (
            copy.dashboard.staff.noPhone
          )}
        </span>
        <span className={cardMetaRow}>
          <Mail className={cardMetaIcon} aria-hidden="true" />
          {employee.email ? (
            <a href={`mailto:${employee.email}`} className="truncate font-semibold hover:underline">
              {employee.email}
            </a>
          ) : (
            copy.dashboard.staff.noEmail
          )}
        </span>
        <span className={cardMetaRow}>
          <Scissors className={cardMetaIcon} aria-hidden="true" />
          {serviceCountLabel(employee.serviceCount, copy.dashboard.staff)}
        </span>
      </div>
    </article>
  );
}

/**
 * Hebrew and English both read badly with "1 services", and Hebrew's singular is a different word
 * rather than a dropped "s" — so one and zero each get their own sentence instead of a count
 * interpolated into a plural template.
 */
function serviceCountLabel(
  count: number,
  copy: { serviceCount: string; serviceCountOne: string; noServices: string },
): string {
  if (count === 0) return copy.noServices;
  if (count === 1) return copy.serviceCountOne;
  return copy.serviceCount.replace('{count}', String(count));
}

/** The staff photo, falling back to the initial — `resolvePhotoUrl()` returns '' when unset (§12.46). */
function StaffAvatar({ employee }: { employee: DashboardEmployee }) {
  return (
    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[var(--soft-violet)] text-[var(--brand)]">
      {employee.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- Storage host isn't in next.config's remotePatterns (§8)
        <img src={employee.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : employee.fullName ? (
        <span className="text-lg font-extrabold">{[...employee.fullName][0]}</span>
      ) : (
        <UserRound className="h-6 w-6" aria-hidden="true" />
      )}
    </span>
  );
}
