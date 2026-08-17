'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BriefcaseBusiness, Building2, Plus, Search, UserPlus } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';

type BusinessFilter = 'all' | 'owned' | 'staff' | 'pending';

export function MyBusinessesPage() {
  const { copy } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<BusinessFilter>('all');

  const filters: { id: BusinessFilter; label: string }[] = [
    { id: 'all', label: copy.myBusinesses.all },
    { id: 'owned', label: copy.myBusinesses.owned },
    { id: 'staff', label: copy.myBusinesses.activeStaff },
    { id: 'pending', label: copy.myBusinesses.pending },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#30257b] via-[#1e2857] to-[#111938] px-5 py-7 text-white shadow-[0_24px_45px_-30px_rgba(23,27,70,0.85)] sm:px-8 sm:py-9">
        <div className="flex flex-col gap-6 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{copy.myBusinesses.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{copy.myBusinesses.description}</p>
          </div>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#7169ef] bg-[#4237aa] text-[#a8b0ff] shadow-inner">
            <BriefcaseBusiness className="h-7 w-7" aria-hidden="true" />
          </span>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Link
              href="/onboarding"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--brand)] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--brand)]/25 transition-colors hover:bg-[#4736d7]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {copy.myBusinesses.openBusiness}
            </Link>
            <Link
              href="/join"
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/15"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              {copy.myBusinesses.joinBusiness}
            </Link>
          </div>

          <div role="tablist" aria-label={copy.myBusinesses.title} className="grid grid-cols-2 gap-2 sm:flex">
            {filters.map((filter) => {
              const selected = filter.id === activeFilter;
              return (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`rounded-2xl px-3 py-2 text-sm font-bold transition-colors ${
                    selected
                      ? 'bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand)]/25'
                      : 'bg-white/10 text-slate-200 hover:bg-white/15'
                  }`}
                >
                  {filter.label} <span className="ms-1 rounded-full bg-white/15 px-1.5 py-0.5 text-xs">0</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-semibold text-[var(--muted)]">{copy.myBusinesses.resultCount}</p>
        <label className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute inset-y-0 start-4 my-auto h-5 w-5 text-[var(--muted)]" aria-hidden="true" />
          <input
            type="search"
            placeholder={copy.myBusinesses.searchPlaceholder}
            className="w-full rounded-2xl border border-[var(--line)] bg-white py-3 pe-4 ps-11 text-sm text-[var(--foreground)] shadow-sm outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15"
          />
        </label>
      </div>

      <section className="flex min-h-80 flex-col items-center justify-center rounded-[2rem] border border-[var(--line)] bg-white px-6 py-14 text-center shadow-[0_16px_35px_-28px_rgba(23,27,70,0.55)]">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600">
          <Building2 className="h-9 w-9" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-extrabold text-[var(--foreground)]">{copy.myBusinesses.emptyTitle}</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">{copy.myBusinesses.emptyDescription}</p>
      </section>

      <p className="text-center text-xs text-[var(--muted)]">{copy.myBusinesses.demoNotice}</p>
    </div>
  );
}
