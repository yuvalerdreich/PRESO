'use client';

import { actionButton, actionButtonChip, actionButtonSelected } from '@/components/common/button-styles';

export type AppointmentsTabId = 'upcoming' | 'waitlist' | 'history';

export function AppointmentsTabs({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
}: {
  tabs: { id: AppointmentsTabId; label: string; count: number }[];
  activeTab: AppointmentsTabId;
  onChange: (tab: AppointmentsTabId) => void;
  variant?: 'default' | 'hero';
}) {
  return (
    <div role="tablist" className={`grid grid-cols-1 gap-2 sm:grid-cols-3 ${variant === 'hero' ? '' : 'rounded-full bg-[var(--soft-violet)] p-1'}`}>
      {tabs.map((tab) => {
        const selected = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`appointments-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`appointments-tabpanel-${tab.id}`}
            onClick={() => onChange(tab.id)}
            // Both variants share the one colour; only the selected ring separates them, exactly
            // as the business area's filter chips do (components/common/button-styles.ts).
            className={`${actionButton} ${actionButtonChip} ${selected ? actionButtonSelected : ''}`}
          >
            <span>{tab.label}</span>
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/20 px-1 text-xs font-semibold text-white">
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
