'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

import { actionButton } from '@/components/common/button-styles';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { ErrorNotice } from '@/components/common/error-dialog';
import { Modal } from '@/components/common/modal';
import { readApiErrorMessage } from '@/lib/api-error';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { DashboardAppointment, Slot } from '@/types/domain';

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

/** Inclusive-start, exclusive-end bounds for one month, clamped to "now" only when "now" itself falls inside it. */
function monthRangeISO(monthISO: string): { from: string; to: string } {
  const [year, month] = monthISO.split('-').map(Number);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));
  const now = new Date();
  const from = now > monthStart && now < monthEnd ? now : monthStart;
  return { from: from.toISOString(), to: monthEnd.toISOString() };
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

/**
 * Business-initiated reschedule, opened from the diary row (`dashboard-appointment-list.tsx`).
 *
 * One component walks through two steps rather than opening a second modal on top of the first —
 * the same "swap the content, keep the window" shape `BookingConfirmDialog` already uses for its
 * confirm → thank-you transition. Step one is literally the shared `ConfirmDialog` (§12.60, the
 * project's one confirmation surface), so the "are you sure" question looks like every other
 * confirmation in the app. Step two replaces it with a month calendar + slot list for the
 * appointment's own employee/service pair, fetched from `GET /api/availability` — the same
 * thin caller over `get_available_slots()` the public booking page uses, just driven by local
 * component state here instead of URL params (this modal never navigates the diary page away
 * from the day it was opened on).
 *
 * Confirming calls `PATCH /api/appointments/[id]` with `action: 'reschedule'` — the same RPC
 * (`reschedule_appointment()`) the client's own "reschedule" flow already uses. That function
 * authorises the caller as client, assigned employee, owner, *or* admin, and always notifies
 * whoever did **not** perform the change — so a staff-initiated reschedule here already reaches
 * the client as an `APPOINTMENT_RESCHEDULED` notification with no server-side change needed.
 *
 * The availability fetch goes through `useQuery` rather than a plain `useEffect` — `providers.tsx`
 * already sets up TanStack Query for exactly one read in this product, "the availability request",
 * and this is that same request, just driven by this dialog's own month/step state instead of the
 * booking page's URL params.
 */
export function RescheduleAppointmentDialog({
  appointment,
  onClose,
}: {
  appointment: DashboardAppointment;
  onClose: () => void;
}) {
  const { copy, locale } = useLanguage();
  const router = useRouter();
  const t = copy.dashboard.diary.reschedule;

  const [step, setStep] = useState<'confirm' | 'calendar'>('confirm');
  const [monthISO, setMonthISO] = useState(() => appointment.dateISO.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Memoized on `monthISO` alone: `monthRangeISO` reads `Date.now()` internally, so calling it
  // directly in the render body minted a new `from` timestamp — and therefore a new query key —
  // on every render. React Query saw an ever-changing key as an ever-new query, never settling
  // into a resolved state, which is why the calendar looked stuck on "loading" and hammered
  // `/api/availability` continuously instead of fetching once per month.
  const { from, to } = useMemo(() => monthRangeISO(monthISO), [monthISO]);
  const availabilityQuery = useQuery({
    queryKey: ['reschedule-availability', appointment.employeeId, appointment.serviceId, from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ employeeId: appointment.employeeId, serviceId: appointment.serviceId, from, to });
      const response = await fetch(`/api/availability?${params.toString()}`);
      if (!response.ok) throw new Error((await readApiErrorMessage(response)) ?? t.errorGeneric);
      return (await response.json()) as { slots: Slot[] };
    },
    enabled: step === 'calendar',
  });

  const slots = availabilityQuery.data?.slots ?? null;
  const loadingSlots = step === 'calendar' && availabilityQuery.isFetching;
  const loadError = availabilityQuery.isError ? (availabilityQuery.error as Error).message : null;

  function changeMonth(delta: number) {
    setMonthISO((current) => shiftMonth(current, delta));
    setSelectedDate(null);
    setSelectedTime(null);
  }

  const availableDates = useMemo(() => new Set((slots ?? []).map((slot) => slot.dateISO)), [slots]);
  const daySlots = useMemo(
    () => (slots ?? []).filter((slot) => slot.dateISO === selectedDate),
    [slots, selectedDate],
  );

  async function confirmReschedule() {
    if (!selectedDate || !selectedTime || submitting) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const startsAt = `${selectedDate}T${selectedTime}:00`;
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reschedule', startsAt }),
      });

      if (!response.ok) {
        setSubmitError((await readApiErrorMessage(response)) ?? t.errorGeneric);
        return;
      }

      toast.success(t.successToast);
      router.refresh();
      onClose();
    } catch {
      setSubmitError(t.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'confirm') {
    return (
      <ConfirmDialog
        title={t.confirmTitle}
        description={t.confirmDescription
          .replace('{client}', appointment.clientName || copy.dashboard.diary.unnamedClient)
          .replace('{service}', appointment.serviceName)
          .replace('{date}', appointment.dateISO)
          .replace('{time}', appointment.time)}
        confirmLabel={t.confirmYes}
        cancelLabel={t.confirmNo}
        closeLabel={copy.common.close}
        onConfirm={() => setStep('calendar')}
        onCancel={onClose}
      />
    );
  }

  const [year, month] = monthISO.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingBlanks = new Date(year, month - 1, 1).getDay();
  const todayISO = toISODate(new Date());

  const cells: Array<{ day: number; dateISO: string } | null> = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return { day, dateISO: `${monthISO}-${pad(day)}` };
    }),
  ];

  return (
    <Modal onClose={onClose} closeLabel={copy.common.close} ariaLabel={t.calendarTitle}>
      <div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">{t.calendarTitle}</h2>
        <p className="mt-1 text-sm text-[var(--brand-deep)]">
          {t.calendarSubtitle
            .replace('{employee}', appointment.employeeName)
            .replace('{service}', appointment.serviceName)}
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-3xl bg-[var(--brand-dark)] p-6 text-white">
        <div className="flex items-center justify-between">
          <p className="font-bold">{monthLabel(monthISO, locale)}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label={locale === 'he' ? 'החודש הקודם' : 'Previous month'}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label={locale === 'he' ? 'החודש הבא' : 'Next month'}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
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

            const isAvailable = availableDates.has(cell.dateISO) && cell.dateISO >= todayISO;
            const isSelected = cell.dateISO === selectedDate;

            if (!isAvailable) {
              return (
                <span
                  key={cell.dateISO}
                  className="flex h-9 w-9 items-center justify-center justify-self-center rounded-full text-sm text-white/30"
                >
                  {cell.day}
                </span>
              );
            }

            return (
              <button
                key={cell.dateISO}
                type="button"
                onClick={() => {
                  setSelectedDate(cell.dateISO);
                  setSelectedTime(null);
                }}
                className={`flex h-9 w-9 items-center justify-center justify-self-center rounded-full bg-white text-sm font-semibold text-[var(--brand-dark)] ${
                  isSelected ? 'ring-2 ring-amber-400' : ''
                }`}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>

      {loadingSlots ? (
        <p className="text-center text-sm text-[var(--muted)]">{t.loadingSlots}</p>
      ) : loadError ? (
        <ErrorNotice description={loadError} />
      ) : slots && slots.length === 0 ? (
        <p className="text-center text-sm text-[var(--muted)]">{t.noAvailability}</p>
      ) : !selectedDate ? (
        <p className="text-center text-sm text-[var(--muted)]">{t.selectDatePrompt}</p>
      ) : daySlots.length === 0 ? (
        <p className="text-center text-sm text-[var(--muted)]">{t.noSlotsForDate}</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {daySlots.map((slot) => (
            <button
              key={slot.startsAt}
              type="button"
              onClick={() => setSelectedTime(slot.time)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                slot.time === selectedTime
                  ? 'border-[var(--brand)] bg-[var(--soft-violet)] text-[var(--brand-deep)]'
                  : 'border-[var(--line)] bg-white text-[var(--foreground)] hover:border-[var(--brand)]/40'
              }`}
            >
              {slot.time}
            </button>
          ))}
        </div>
      )}

      {submitError ? <ErrorNotice description={submitError} /> : null}

      <div className="flex items-center gap-3 border-t border-[var(--line)] pt-4">
        <button
          type="button"
          onClick={confirmReschedule}
          disabled={!selectedTime || submitting}
          className={`${actionButton} flex-1 rounded-full px-4 py-3 text-sm`}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {submitting ? t.confirmingSlot : t.confirmSlot}
        </button>
      </div>
    </Modal>
  );
}
