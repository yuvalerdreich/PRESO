'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bell, Calendar, Check, Clock, Moon, Sun, Sunrise, Sunset, SlidersHorizontal } from 'lucide-react';

import { Modal } from '@/components/common/modal';
import { useLanguage } from '@/lib/i18n/language-provider';

type PresetRangeId = 'noon' | 'morning' | 'evening' | 'afternoon' | 'flexible';
type RangeId = PresetRangeId | 'manual';

const PRESET_RANGES: Record<PresetRangeId, { start: string; end: string; icon: typeof Sun }> = {
  noon: { start: '12:00', end: '16:00', icon: Sun },
  morning: { start: '08:00', end: '12:00', icon: Sunrise },
  evening: { start: '19:00', end: '22:00', icon: Moon },
  afternoon: { start: '16:00', end: '19:00', icon: Sunset },
  flexible: { start: '08:00', end: '22:00', icon: Clock },
};

const GRID_ORDER: PresetRangeId[] = ['noon', 'morning', 'evening', 'afternoon'];

function formatDisplayDate(dateISO: string): string {
  const [year, month, day] = dateISO.split('-');
  return `${day}/${month}/${year}`;
}

function OptionCard({
  selected,
  label,
  timeRange,
  icon: Icon,
  onSelect,
  fullWidth,
}: {
  selected: boolean;
  label: string;
  timeRange?: string;
  icon: typeof Sun;
  onSelect: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex items-center justify-between gap-3 rounded-2xl border p-3 text-right transition-colors ${
        fullWidth ? 'col-span-2' : ''
      } ${
        selected
          ? 'border-amber-400 bg-amber-50'
          : 'border-[var(--line)] bg-white hover:border-amber-300'
      }`}
    >
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-[var(--foreground)]">{label}</span>
        {timeRange ? <span className="text-xs text-[var(--muted)]">{timeRange}</span> : null}
      </div>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          selected ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600'
        }`}
      >
        {selected ? <Check className="h-4.5 w-4.5" aria-hidden="true" /> : <Icon className="h-4.5 w-4.5" aria-hidden="true" />}
      </span>
    </button>
  );
}

export function WaitlistJoinModal({
  closeHref,
  businessName,
  employeeName,
  serviceName,
  servicePrice,
  dateISO,
}: {
  closeHref: string;
  businessName: string;
  employeeName: string;
  serviceName: string;
  servicePrice: number;
  dateISO: string;
}) {
  const { copy, direction } = useLanguage();
  const router = useRouter();

  const [selected, setSelected] = useState<RangeId>('flexible');
  const [manualStart, setManualStart] = useState('08:00');
  const [manualEnd, setManualEnd] = useState('22:00');

  function close() {
    router.push(closeHref);
  }

  function handleConfirm() {
    toast.success(copy.waitlistJoin.successTitle, {
      description: copy.waitlistJoin.successDescription,
    });
    close();
  }

  const priceLabel = copy.businessProfile.price;

  return (
    <Modal onClose={close} closeLabel={copy.waitlistJoin.close}>
      <div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">{copy.waitlistJoin.title}</h2>
        <p className="text-sm text-[var(--brand)]">
          {businessName} • {employeeName}
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl bg-[var(--soft-violet)] p-4 text-sm">
        <p className="font-semibold text-[var(--foreground)]">
          {serviceName} ({servicePrice}
          {priceLabel})
        </p>
        <p className="flex items-center gap-1.5 font-medium text-[var(--brand-deep)]">
          <Calendar className="h-4 w-4" aria-hidden="true" />
          {copy.waitlistJoin.requestedDateLabel}: {formatDisplayDate(dateISO)}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h3 className="flex items-center gap-1.5 text-base font-bold text-[var(--foreground)]">
            <Clock className="h-4 w-4 text-amber-600" aria-hidden="true" />
            {copy.waitlistJoin.preferredHoursTitle}
          </h3>
          <p className="text-sm text-[var(--muted)]">{copy.waitlistJoin.preferredHoursSubtitle}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {GRID_ORDER.map((id) => (
            <OptionCard
              key={id}
              selected={selected === id}
              label={copy.waitlistJoin[id]}
              timeRange={`${PRESET_RANGES[id].start} - ${PRESET_RANGES[id].end}`}
              icon={PRESET_RANGES[id].icon}
              onSelect={() => setSelected(id)}
            />
          ))}

          <OptionCard
            selected={selected === 'flexible'}
            label={copy.waitlistJoin.flexible}
            timeRange={`${PRESET_RANGES.flexible.start} - ${PRESET_RANGES.flexible.end}`}
            icon={PRESET_RANGES.flexible.icon}
            onSelect={() => setSelected('flexible')}
            fullWidth
          />

          <OptionCard
            selected={selected === 'manual'}
            label={copy.waitlistJoin.manual}
            timeRange={copy.waitlistJoin.manualDescription}
            icon={SlidersHorizontal}
            onSelect={() => setSelected('manual')}
            fullWidth
          />
        </div>

        {selected === 'manual' ? (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3" dir={direction}>
            <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-[var(--muted)]">
              {copy.waitlistJoin.manualFromLabel}
              <input
                type="time"
                value={manualStart}
                onChange={(event) => setManualStart(event.target.value)}
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-[var(--muted)]">
              {copy.waitlistJoin.manualToLabel}
              <input
                type="time"
                value={manualEnd}
                onChange={(event) => setManualEnd(event.target.value)}
                className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none"
              />
            </label>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-3 border-t border-[var(--line)] pt-4">
        <button
          type="button"
          onClick={handleConfirm}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {copy.waitlistJoin.confirm}
        </button>
        <button
          type="button"
          onClick={close}
          className="rounded-full border border-[var(--line)] px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--soft-violet)]"
        >
          {copy.waitlistJoin.cancel}
        </button>
      </div>
    </Modal>
  );
}
