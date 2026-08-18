'use client';

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

      {error ? (
        <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="flex-1 rounded-full border border-[var(--line)] px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--soft-violet)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {copy.appointments.keepAppointment}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="flex-1 rounded-full bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? copy.appointments.cancelling : copy.appointments.confirmCancel}
        </button>
      </div>
    </Modal>
  );
}
