'use client';

import { cardChip } from '@/components/common/card-styles';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { AppointmentStatus } from '@/types/domain';

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  CONFIRMED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  CANCELLED: 'bg-[var(--soft-violet)] text-[var(--muted)]',
};

/**
 * The i18n dictionary is keyed independently of the database enum — `copy.appointments.*` is UI
 * copy, not a mirror of `appointment_status`. This map is the seam between the two rather than
 * lowercasing the status and hoping the two vocabularies stay aligned.
 */
const STATUS_COPY_KEY: Record<AppointmentStatus, 'confirmed' | 'pending' | 'cancelled'> = {
  CONFIRMED: 'confirmed',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
};

/**
 * One status pill for both portals — the client's appointment card and the business diary. It lives
 * in `common/` (§9) because a client and the staff serving them must read the same word for the
 * same row: "ממתין לאישור" on one screen and something else on the other would be two different
 * claims about one appointment.
 *
 * Shape comes from `card-styles.ts`'s `cardChip`; only the colour pair is decided here, since that
 * is the part carrying meaning.
 */
export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const { copy } = useLanguage();

  return (
    <span className={`${cardChip} ${STATUS_STYLES[status]}`}>
      {copy.appointments[STATUS_COPY_KEY[status]]}
    </span>
  );
}
