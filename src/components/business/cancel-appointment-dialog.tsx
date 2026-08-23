'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { readApiErrorMessage } from '@/lib/api-error';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { DashboardAppointment } from '@/types/domain';

/**
 * Business-initiated cancellation, opened from the diary row — the same
 * `PATCH /api/appointments/[id]` / `action: 'cancel'` route the client's own cancel flow uses
 * (`AppointmentsPanel`'s `CancelAppointmentDialog`), just reached from the other side.
 *
 * `cancel_appointment()` (0007_fn_booking.sql, §6.3 step 3) waives the cancellation window for
 * staff/owner/admin callers — only a client cancelling their own appointment can hit the 422 the
 * client-side dialog has to show — so this one keeps it simple: a single shared `ConfirmDialog`
 * (§12.60) and a toast on failure, rather than an inline error surface that stays mounted.
 *
 * The notification reaching the client needs no server-side change: `on_appointment_cancelled()`
 * (0009_triggers.sql) already notifies whoever did **not** cancel — the client, when staff acts —
 * with `businessName`/`employeeName`/`serviceName`/`startsAt` on the payload, which
 * `formatNotification()`'s `APPOINTMENT_CANCELLED` branch composes into one sentence.
 */
export function CancelAppointmentDialog({
  appointment,
  onClose,
}: {
  appointment: DashboardAppointment;
  onClose: () => void;
}) {
  const { copy } = useLanguage();
  const router = useRouter();
  const t = copy.dashboard.diary.cancelDialog;
  const [pending, setPending] = useState(false);

  async function confirmCancel() {
    if (pending) return;
    setPending(true);

    try {
      const response = await fetch(`/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });

      if (!response.ok) {
        toast.error((await readApiErrorMessage(response)) ?? t.errorGeneric);
        return;
      }

      toast.success(t.successToast);
      router.refresh();
      onClose();
    } catch {
      toast.error(t.errorGeneric);
    } finally {
      setPending(false);
    }
  }

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
      pending={pending}
      pendingLabel={t.cancelling}
      onConfirm={confirmCancel}
      onCancel={onClose}
    />
  );
}
