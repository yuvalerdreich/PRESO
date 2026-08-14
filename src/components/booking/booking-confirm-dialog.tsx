'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Clock, HelpCircle, X } from 'lucide-react';

import { Modal } from '@/components/common/modal';
import { useLanguage } from '@/lib/i18n/language-provider';

function formatDisplayDate(dateISO: string): string {
  const [year, month, day] = dateISO.split('-');
  return `${day}/${month}/${year}`;
}

export function BookingConfirmDialog({
  closeHref,
  employeeId,
  serviceId,
  businessName,
  employeeName,
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
  serviceName: string;
  servicePrice: number;
  durationMinutes: number;
  dateISO: string;
  time: string;
}) {
  const { copy } = useLanguage();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      if (created.status === 'CONFIRMED') {
        toast.success(copy.bookingConfirm.successConfirmedTitle, {
          description: copy.bookingConfirm.successConfirmedDescription,
        });
      } else {
        toast.success(copy.bookingConfirm.successPendingTitle, {
          description: copy.bookingConfirm.successPendingDescription,
        });
      }

      router.push(closeHref);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  const priceLabel = copy.businessProfile.price;

  return (
    <Modal onClose={close} closeLabel={copy.bookingConfirm.close} ariaLabel={copy.bookingConfirm.title}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">{copy.bookingConfirm.title}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{copy.bookingConfirm.description}</p>
        </div>
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand)] text-white"
          aria-hidden="true"
        >
          <HelpCircle className="h-5 w-5" />
        </span>
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
