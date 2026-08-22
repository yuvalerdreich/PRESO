'use client';

import Link from 'next/link';
import { CalendarDays, ChevronLeft, ChevronRight, Info } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shiftMonth(monthISO: string, delta: number): string {
  const [year, month] = monthISO.split('-').map(Number);
  const shifted = new Date(year, month - 1 + delta, 1);
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}`;
}

function weekdayLabels(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { weekday: 'narrow' });
  // 2023-01-01 was a Sunday — used only as a reference to read off Sun..Sat labels.
  return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2023, 0, 1 + i)));
}

function monthLabel(monthISO: string, locale: string): string {
  const [year, month] = monthISO.split('-').map(Number);
  const formatter = new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', { month: 'long', year: 'numeric' });
  return formatter.format(new Date(year, month - 1, 1));
}

export function AvailabilityCalendar({
  basePath,
  employeeName,
  monthISO,
  selectedDate,
  availableDates,
}: {
  basePath: string;
  employeeName: string;
  monthISO: string;
  selectedDate: string;
  availableDates: string[];
}) {
  const { copy, locale } = useLanguage();

  const [year, month] = monthISO.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingBlanks = new Date(year, month - 1, 1).getDay();
  const todayISO = toISODate(new Date());
  const available = new Set(availableDates);

  const cells: Array<{ day: number; dateISO: string } | null> = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return { day, dateISO: toISODate(new Date(year, month - 1, day)) };
    }),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">{copy.businessProfile.chooseDateTitle}</h2>
        </div>
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-xs font-semibold text-white">
          3
        </span>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl bg-[var(--brand-dark)] p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-right">
            <div>
              <p className="font-bold">{monthLabel(monthISO, locale)}</p>
              <p className="text-xs text-white/70">
                {copy.businessProfile.availabilityCalendarFor}: {employeeName}
              </p>
            </div>
            <CalendarDays className="h-5 w-5 text-white/70" aria-hidden="true" />
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`${basePath}?month=${shiftMonth(monthISO, -1)}`}
              scroll={false}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label={locale === 'he' ? 'החודש הקודם' : 'Previous month'}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href={`${basePath}?month=${shiftMonth(monthISO, 1)}`}
              scroll={false}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label={locale === 'he' ? 'החודש הבא' : 'Next month'}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs text-white/60">
          {weekdayLabels(locale).map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {cells.map((cell, i) => {
            if (!cell) return <span key={`blank-${i}`} />;

            const isAvailable = available.has(cell.dateISO) && cell.dateISO >= todayISO;
            const isSelected = cell.dateISO === selectedDate;

            if (!isAvailable) {
              return (
                <span
                  key={cell.dateISO}
                  className={`flex h-9 w-9 items-center justify-center justify-self-center rounded-full text-sm text-white/30 ${
                    isSelected ? 'ring-2 ring-amber-400' : ''
                  }`}
                >
                  {cell.day}
                </span>
              );
            }

            return (
              <Link
                key={cell.dateISO}
                href={`${basePath}?month=${monthISO}&date=${cell.dateISO}`}
                scroll={false}
                className={`flex h-9 w-9 items-center justify-center justify-self-center rounded-full bg-white text-sm font-semibold text-[var(--brand-dark)] ${
                  isSelected ? 'ring-2 ring-amber-400' : ''
                }`}
              >
                {cell.day}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
        <span className="flex items-center gap-1.5 text-amber-700">
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.businessProfile.availableDatesCaption}
        </span>
        <span>{copy.businessProfile.futureWaitlistNote}</span>
      </div>
    </div>
  );
}
