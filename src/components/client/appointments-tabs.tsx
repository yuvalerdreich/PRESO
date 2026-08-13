'use client';

type AppointmentsTabsProps<T extends string> = {
  activeTab: T;
  tabs: { id: T; label: string; count: number }[];
  onChange: (tab: T) => void;
};

export function AppointmentsTabs<T extends string>({ activeTab, tabs, onChange }: AppointmentsTabsProps<T>) {
  return (
    <div className="flex gap-1 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[#f7f7fb] p-1" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-[var(--brand)] ${activeTab === tab.id ? 'bg-white text-[var(--brand)] shadow-[0_3px_10px_rgba(37,34,99,.08)]' : 'text-[var(--muted)] hover:bg-white/70 hover:text-[var(--brand)]'}`}
        >
          {tab.label}
          <span className={`rounded-full px-1.5 py-0.5 text-xs ${activeTab === tab.id ? 'bg-violet-100 text-[var(--brand)]' : 'bg-white text-[var(--muted)]'}`}>{tab.count}</span>
        </button>
      ))}
    </div>
  );
}
