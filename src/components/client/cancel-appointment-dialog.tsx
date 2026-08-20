'use client';

import { ErrorNotice } from '@/components/common/error-dialog';
import { actionButton } from '@/components/common/button-styles';
import { Modal } from '@/components/common/modal';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { ClientAppointment } from '@/types/domain';

export function CancelAppointmentDialog({
  appointment,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  appointment: ClientAppointment;
  /** True while `PATCH /api/appointments/[id]` is in flight — both buttons lock. */
  pending?: boolean;
  /**
   * `error.message` from §8.4's envelope, shown verbatim. The one that matters in practice is the
   * 422 raised by `cancel_appointment()` when the business's `cancellation_window_hours` has
   * already passed: the dialog stays open so the user reads why, rather than closing on a failure.
   */
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { copy } = useLanguage();

  return (
    <Modal onClose={onClose} closeLabel={copy.appointments.close} ariaLabel={copy.appointments.cancelTitle}>
      <div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">{copy.appointments.cancelTitle}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{copy.appointments.cancelDescription}</p>
      </div>

      <div className="rounded-2xl bg-[var(--soft-violet)] p-4 text-sm">
        <p className="font-semibold text-[var(--foreground)]">{appointment.serviceName}</p>
        <p className="text-[var(--brand-deep)]">
          {appointment.businessName} • {appointment.dateISO} {appointment.time}
        </p>
      </div>

      {error ? <ErrorNotice description={error} /> : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className={`${actionButton} flex-1 rounded-full px-4 py-3 text-sm`}
        >
          {copy.appointments.keepAppointment}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={`${actionButton} flex-1 rounded-full px-4 py-3 text-sm`}
        >
          {pending ? copy.appointments.cancelling : copy.appointments.confirmCancel}
        </button>
      </div>
    </Modal>
  );
}
