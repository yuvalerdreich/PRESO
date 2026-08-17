'use client';

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
            className={`flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors ${
              variant === 'hero'
                ? selected
                  ? 'bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand)]/25'
                  : 'bg-white/10 text-slate-200 hover:bg-white/15'
                : selected
                  ? 'bg-white text-[var(--brand-deep)] shadow-sm'
                  : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold ${
                selected
                  ? variant === 'hero'
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--brand)] text-white'
                  : variant === 'hero'
                    ? 'bg-white/15 text-white'
                    : 'bg-white text-[var(--muted)]'
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
