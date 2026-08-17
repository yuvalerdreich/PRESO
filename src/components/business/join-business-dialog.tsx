'use client';

import { useMemo, useState } from 'react';
import { Building2, CheckCircle2, MapPin, Phone, Search, UserPlus, X } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { BusinessSummary } from '@/types/domain';

const fieldClassName =
  'mt-2 w-full rounded-2xl border border-[var(--line)] bg-slate-50 px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15';

export function JoinBusinessDialog({ businesses, onClose }: { businesses: BusinessSummary[]; onClose: () => void }) {
  const { copy } = useLanguage();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(businesses[0]?.id ?? '');
  const [submitted, setSubmitted] = useState(false);

  const visibleBusinesses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return businesses;
    return businesses.filter((business) =>
      [business.name, business.area, business.description].join(' ').toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [businesses, query]);
  const selectedBusiness = businesses.find((business) => business.id === selectedId) ?? null;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBusiness) return;
    setSubmitted(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.joinBusiness.title}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-5 sm:px-8">
          <div className="flex items-center gap-4 text-right">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand)]/30">
              <UserPlus className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-[var(--foreground)]">{copy.joinBusiness.title}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{copy.joinBusiness.description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.joinBusiness.close}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--soft-violet)] hover:text-[var(--foreground)]"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </header>

        {submitted ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-xl font-extrabold text-[var(--foreground)]">{copy.joinBusiness.submittedTitle}</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{copy.joinBusiness.submittedDescription}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-7 rounded-2xl bg-[var(--brand)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--brand-deep)]"
            >
              {copy.joinBusiness.close}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
            <section className="border-b border-[var(--line)] pb-6">
              <h3 className="flex items-center gap-2 text-base font-extrabold text-[var(--brand)]">
                <Building2 className="h-5 w-5" aria-hidden="true" />
                {copy.joinBusiness.selectionStep}
              </h3>

              <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="flex flex-col gap-3">
                  <label className="relative block">
                    <Search className="pointer-events-none absolute inset-y-0 start-4 my-auto h-5 w-5 text-[var(--muted)]" aria-hidden="true" />
                    <input
                      type="search"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder={copy.joinBusiness.searchPlaceholder}
                      className="w-full rounded-2xl border border-[var(--line)] bg-slate-50 py-3 pe-4 ps-11 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15"
                    />
                  </label>

                  <div className="rounded-3xl border border-[var(--line)] bg-slate-50/70 p-2">
                    {visibleBusinesses.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {visibleBusinesses.map((business) => {
                          const selected = business.id === selectedId;
                          return (
                            <button
                              key={business.id}
                              type="button"
                              onClick={() => setSelectedId(business.id)}
                              className={`flex w-full items-center gap-3 rounded-2xl p-3 text-right transition-colors ${
                                selected
                                  ? 'bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand)]/20'
                                  : 'bg-white text-[var(--foreground)] hover:bg-[var(--soft-violet)]'
                              }`}
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current">
                                {selected ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : null}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-extrabold">{business.name}</p>
                                <p className={`mt-0.5 truncate text-xs ${selected ? 'text-white/75' : 'text-[var(--muted)]'}`}>
                                  {business.description}
                                </p>
                              </div>
                              {/* eslint-disable-next-line @next/next/no-img-element -- demo images come from the local discovery fixture */}
                              <img src={business.photoUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">{copy.joinBusiness.noResults}</p>
                    )}
                  </div>
                </div>

                <SelectedBusinessCard business={selectedBusiness} label={copy.joinBusiness.selectedBusiness} />
              </div>
            </section>

            <section className="border-b border-[var(--line)] py-6">
              <h3 className="flex items-center gap-2 text-base font-extrabold text-[var(--brand)]">
                <UserPlus className="h-5 w-5" aria-hidden="true" />
                {copy.joinBusiness.detailsStep}
              </h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-bold text-[var(--foreground)]">
                  {copy.joinBusiness.position}<span className="ms-1 text-rose-500">*</span>
                  <input required className={fieldClassName} placeholder="מעצב/ת שיער / נותן/ת שירות" />
                </label>
                <label className="text-sm font-bold text-[var(--foreground)]">
                  {copy.joinBusiness.phone}<span className="ms-1 text-rose-500">*</span>
                  <span className="relative block">
                    <Phone className="pointer-events-none absolute inset-y-0 start-4 my-auto h-5 w-5 text-[var(--muted)]" aria-hidden="true" />
                    <input required type="tel" className={`${fieldClassName} ps-11`} defaultValue="054-1112233" />
                  </span>
                </label>
              </div>
              <p className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800">
                {copy.joinBusiness.notice}
              </p>
            </section>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!selectedBusiness}
                className="flex items-center gap-2 rounded-2xl bg-[var(--brand)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--brand)]/25 hover:bg-[var(--brand-deep)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                {copy.joinBusiness.submit}
              </button>
              <button type="button" onClick={onClose} className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-[var(--foreground)] hover:bg-slate-200">
                {copy.joinBusiness.cancel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function SelectedBusinessCard({ business, label }: { business: BusinessSummary | null; label: string }) {
  if (!business) return null;

  return (
    <aside className="flex h-full flex-col rounded-3xl border border-[#cfcaff] bg-[#f4f2ff] p-5 text-right">
      <p className="text-sm font-bold text-[var(--brand)]">{label}</p>
      <div className="mt-4 flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- demo images come from the local discovery fixture */}
        <img src={business.photoUrl} alt="" className="h-14 w-14 rounded-2xl object-cover" />
        <div className="min-w-0 flex-1">
          <h4 className="text-base font-extrabold text-[var(--foreground)]">{business.name}</h4>
          <p className="mt-1 flex items-center gap-1 text-sm text-[var(--muted)]">
            <MapPin className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
            {business.address}
          </p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-6 text-[var(--muted)]">{business.description}</p>
      <p className="mt-auto border-t border-[#dcd8ff] pt-4 text-sm font-semibold text-[var(--brand)]">{business.area}</p>
    </aside>
  );
}
