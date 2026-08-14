'use client';

export type AppointmentsTabId = 'upcoming' | 'waitlist' | 'history';

export function AppointmentsTabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: { id: AppointmentsTabId; label: string; count: number }[];
  activeTab: AppointmentsTabId;
  onChange: (tab: AppointmentsTabId) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 rounded-full bg-[var(--soft-violet)] p-1">
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
            className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
              selected
                ? 'bg-white text-[var(--brand-deep)] shadow-sm'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                selected ? 'bg-[var(--brand)] text-white' : 'bg-white text-[var(--muted)]'
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
