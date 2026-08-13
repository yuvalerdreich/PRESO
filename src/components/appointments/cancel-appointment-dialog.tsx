'use client';

import { AlertTriangle } from 'lucide-react';

import { Modal } from '@/components/common/modal';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { ClientAppointment } from '@/types/appointments';

type CancelAppointmentDialogProps = {
  appointment: ClientAppointment | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function CancelAppointmentDialog({ appointment, onClose, onConfirm }: CancelAppointmentDialogProps) {
  const { locale, copy } = useLanguage();

  return (
    <Modal isOpen={appointment !== null} label={copy.appointments.cancelTitle} closeLabel={copy.appointments.close} onClose={onClose}>
      <div className="p-5 sm:p-7">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600"><AlertTriangle aria-hidden="true" size={22} /></span>
        <h2 className="mt-4 text-2xl font-black tracking-tight">{copy.appointments.cancelTitle}</h2>
        {appointment && <p className="mt-2 text-sm font-bold text-[var(--brand)]">{appointment.businessName[locale]} · {appointment.serviceName[locale]}</p>}
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{copy.appointments.cancelDescription}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button type="button" onClick={onConfirm} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_8px_16px_rgba(225,29,72,.22)] transition hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-rose-600">
            {copy.appointments.confirmCancel}
          </button>
          <button type="button" onClick={onClose} className="rounded-xl bg-[var(--soft-violet)] px-4 py-2.5 text-sm font-bold text-[var(--foreground)] transition hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-[var(--brand)]">
            {copy.appointments.keepAppointment}
          </button>
        </div>
      </div>
    </Modal>
  );
}
