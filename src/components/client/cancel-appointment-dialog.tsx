'use client';

import { Modal } from '@/components/common/modal';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { ClientAppointment } from '@/types/appointments';

export function CancelAppointmentDialog({
  appointment,
  onConfirm,
  onClose,
}: {
  appointment: ClientAppointment;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { copy, locale } = useLanguage();

  return (
    <Modal onClose={onClose} closeLabel={copy.appointments.close} ariaLabel={copy.appointments.cancelTitle}>
      <div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">{copy.appointments.cancelTitle}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{copy.appointments.cancelDescription}</p>
      </div>

      <div className="rounded-2xl bg-[var(--soft-violet)] p-4 text-sm">
        <p className="font-semibold text-[var(--foreground)]">{appointment.serviceName[locale]}</p>
        <p className="text-[var(--brand-deep)]">
          {appointment.businessName[locale]} • {appointment.dateISO} {appointment.time}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-full border border-[var(--line)] px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--soft-violet)]"
        >
          {copy.appointments.keepAppointment}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-full bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700"
        >
          {copy.appointments.confirmCancel}
        </button>
      </div>
    </Modal>
  );
}
