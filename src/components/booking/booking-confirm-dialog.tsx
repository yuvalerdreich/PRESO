'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertCircle, ArrowLeft, ArrowRight, Check, CheckCircle2, Clock, List, X } from 'lucide-react';

import { useAppointmentsPanel } from '@/components/common/appointments-panel-context';
import { Modal } from '@/components/common/modal';
import { useLanguage } from '@/lib/i18n/language-provider';

function formatDisplayDate(dateISO: string): string {
  const [year, month, day] = dateISO.split('-');
  return `${day}/${month}/${year}`;
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-semibold text-[var(--foreground)]">{value}</span>
    </div>
  );
}

export function BookingConfirmDialog({
  closeHref,
  employeeId,
  serviceId,
  businessName,
  employeeName,
  employeeAvatarUrl,
  serviceName,
  servicePrice,
  durationMinutes,
  dateISO,
  time,
}: {
  closeHref: string;
  employeeId: string;
  serviceId: string;
  businessName: string;
  employeeName: string;
  employeeAvatarUrl?: string;
  serviceName: string;
  servicePrice: number;
  durationMinutes: number;
  dateISO: string;
  time: string;
}) {
  const { copy, direction } = useLanguage();
  const router = useRouter();
  const { open: openAppointmentsPanel } = useAppointmentsPanel();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: 'CONFIRMED' | 'PENDING' } | null>(null);

  const BackArrow = direction === 'rtl' ? ArrowRight : ArrowLeft;

  function close() {
    router.push(closeHref);
  }

  async function handleConfirm() {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, serviceId, startsAt: `${dateISO}T${time}:00` }),
      });

      if (!response.ok) {
        toast.error(copy.bookingConfirm.errorTitle);
        return;
      }

      const created = (await response.json()) as { status: 'CONFIRMED' | 'PENDING' };
      setResult({ status: created.status });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  const priceLabel = copy.businessProfile.price;

  if (result) {
    const isConfirmed = result.status === 'CONFIRMED';

    return (
      <Modal onClose={close} closeLabel={copy.bookingConfirm.close} ariaLabel={copy.bookingConfirm.thankYouTitle}>
        <div className="flex flex-col items-center gap-2 text-center">
          <span
            className={`flex h-16 w-16 items-center justify-center rounded-full ${
              isConfirmed ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-500'
            }`}
          >
            {isConfirmed ? (
              <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-9 w-9" aria-hidden="true" />
            )}
          </span>
          <h2 className="text-lg font-bold text-[var(--foreground)]">{copy.bookingConfirm.thankYouTitle}</h2>
          <p className="text-sm text-[var(--muted)]">{copy.bookingConfirm.thankYouDescription}</p>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] p-4 text-sm">
          <Field label={copy.bookingConfirm.businessLabel} value={businessName} />
          <Field
            label={copy.bookingConfirm.employeeLabel}
            value={
              <span className="flex items-center gap-2">
                {employeeAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- mock photo host isn't in next.config's image remotePatterns
                  <img src={employeeAvatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : null}
                {employeeName}
              </span>
            }
          />
          <Field label={copy.bookingConfirm.serviceLabel} value={serviceName} />
          <Field
            label={copy.bookingConfirm.dateLabel}
            value={`${formatDisplayDate(dateISO)} ${copy.bookingConfirm.timeConnector} ${time}`}
          />
          <Field
            label={copy.bookingConfirm.statusLabel}
            value={isConfirmed ? copy.bookingConfirm.statusConfirmed : copy.bookingConfirm.statusPending}
          />
          <Field label={copy.bookingConfirm.priceLabel} value={`${servicePrice}${priceLabel}`} />
        </div>

        <div className="flex items-center gap-3 border-t border-[var(--line)] pt-4">
          <button
            type="button"
            onClick={close}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[var(--line)] px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--soft-violet)]"
          >
            <BackArrow className="h-4 w-4" aria-hidden="true" />
            {copy.bookingConfirm.bookAnotherAction}
          </button>
          <button
            type="button"
            onClick={() => {
              // Opens the shared panel in place rather than navigating to
              // /me/appointments — proxy.ts gates that route on a real session
              // and no (auth)/login page exists yet to satisfy it.
              openAppointmentsPanel();
              close();
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-deep)]"
          >
            <List className="h-4 w-4" aria-hidden="true" />
            {copy.bookingConfirm.viewAppointmentsAction}
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={close} closeLabel={copy.bookingConfirm.close} ariaLabel={copy.bookingConfirm.title}>
      <div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">{copy.bookingConfirm.title}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{copy.bookingConfirm.description}</p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl bg-[var(--soft-violet)] p-4 text-sm">
        <p className="text-[var(--foreground)]">
          {copy.bookingConfirm.questionIntro} <strong className="text-[var(--brand-deep)]">{businessName}</strong>
          {', '}
          <strong className="text-[var(--brand-deep)]">{employeeName}</strong>{' '}
          {copy.bookingConfirm.serviceTypeConnector} <strong className="font-bold">{serviceName}</strong>{' '}
          {copy.bookingConfirm.dateConnector} <strong className="font-bold">{formatDisplayDate(dateISO)}</strong>{' '}
          {copy.bookingConfirm.timeConnector} <strong className="font-bold">{time}</strong>?
        </p>

        <div className="flex items-center justify-between border-t border-white/60 pt-3 text-[var(--muted)]">
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {copy.bookingConfirm.durationLabel}: {durationMinutes} {copy.businessProfile.duration}
          </span>
          <span className="font-semibold text-[var(--foreground)]">
            {servicePrice}
            {priceLabel}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-[var(--line)] pt-4">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isSubmitting}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-deep)] disabled:opacity-60"
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          {copy.bookingConfirm.confirm}
        </button>
        <button
          type="button"
          onClick={close}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 rounded-full border border-[var(--line)] px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--soft-violet)] disabled:opacity-60"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          {copy.bookingConfirm.cancel}
        </button>
      </div>
    </Modal>
  );
}
