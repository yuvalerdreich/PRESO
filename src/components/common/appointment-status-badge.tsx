'use client';

import { Check, Clock3, X } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { AppointmentStatus } from '@/types/appointments';

const statusStyles = {
  confirmed: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  cancelled: 'bg-rose-100 text-rose-800',
} as const;

const statusIcons = {
  confirmed: Check,
  pending: Clock3,
  cancelled: X,
} as const;

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const { copy } = useLanguage();
  const Icon = statusIcons[status];
  const label = copy.appointments[status];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${statusStyles[status]}`}>
      <Icon aria-hidden="true" size={13} strokeWidth={2.6} />
      {label}
    </span>
  );
}
