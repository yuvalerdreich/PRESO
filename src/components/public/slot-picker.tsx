'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';

function formatDisplayDate(dateISO: string): string {
  const [year, month, day] = dateISO.split('-');
  return `${day}/${month}/${year}`;
}

function bookingHref(
  basePath: string,
  params: Record<string, string>,
  rescheduleAppointmentId?: string,
): string {
  const query = new URLSearchParams(params);
  if (rescheduleAppointmentId) query.set('reschedule', rescheduleAppointmentId);
  return `${basePath}?${query.toString()}`;
}

export function SlotPicker({
  basePath,
  monthISO,
  dateISO,
  employeeName,
  slots,
  selectedSlot,
  rescheduleAppointmentId,
}: {
  basePath: string;
  monthISO: string;
  dateISO: string;
  employeeName: string;
  slots: string[];
  selectedSlot?: string;
  rescheduleAppointmentId?: string;
}) {
  const { copy } = useLanguage();
  const displayDate = formatDisplayDate(dateISO);
  const waitlistHref = bookingHref(basePath, { month: monthISO, date: dateISO, waitlist: '1' }, rescheduleAppointmentId);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-white p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            {copy.businessProfile.availableHoursTitlePrefix}
            {displayDate}
          </h2>
          <p className="text-sm text-[var(--brand-deep)]">
            {copy.businessProfile.availableHoursSubtitlePrefix}
            {employeeName} • {slots.length} {copy.businessProfile.availableHoursSuffix}
          </p>
        </div>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-semibold text-white">
          4
        </span>
      </div>

      {slots.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="font-bold text-[var(--foreground)]">
            {copy.businessProfile.noSlotsTitlePrefix}
            {displayDate}
          </p>
          <p className="max-w-sm text-sm text-[var(--muted)]">{copy.businessProfile.noSlotsDescription}</p>
          <Link
            href={waitlistHref}
            scroll={false}
            className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {copy.businessProfile.joinWaitlistForDate}
          </Link>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            {slots.map((slot) => (
              <Link
                key={slot}
                href={bookingHref(basePath, { month: monthISO, date: dateISO, slot }, rescheduleAppointmentId)}
                scroll={false}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                  slot === selectedSlot
                    ? 'border-[var(--brand)] bg-[var(--soft-violet)] text-[var(--brand-deep)]'
                    : 'border-[var(--line)] bg-white text-[var(--foreground)] hover:border-[var(--brand)]/40'
                }`}
              >
                {slot}
              </Link>
            ))}
          </div>

          <div className="flex justify-center border-t border-[var(--line)] pt-3">
            <Link
              href={waitlistHref}
              scroll={false}
              className="flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              <Bell className="h-4 w-4" aria-hidden="true" />
              {copy.businessProfile.differentTimeWaitlistPrompt}
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
