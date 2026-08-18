'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, MapPin, Search, UserPlus, Users, X } from 'lucide-react';

import { actionButton, actionIconButton } from '@/components/common/button-styles';
import { useLanguage } from '@/lib/i18n/language-provider';
import { sendJoinRequest } from '@/server/actions/employee';
import type { JoinableBusiness } from '@/types/domain';

/**
 * The real "request to join" dialog — it calls `sendJoinRequest` (`server/actions/employee.ts`),
 * which inserts the `join_requests` row and lets `join_requests_one_open` reject a duplicate as a
 * `23505` (§10.3).
 *
 * The mock version also collected a position title and a contact phone. Neither is written here,
 * and both were removed rather than left as decoration: `join_requests` carries only
 * `profile_id`/`business_id`/`status` (§3.11), because the **founder** names the position when
 * approving (`decideJoinRequest.positionTitle`, §6.8 rule 6), and the contact number is the
 * applicant's own `profiles.phone`, edited from profile settings.
 *
 * `pendingRequestStatus` comes from `listJoinableBusinesses()` and is what makes an
 * already-requested business unselectable — surfacing the state beats explaining the 409 the
 * partial unique index would otherwise raise.
 */
export function JoinBusinessDialog({
  businesses,
  onClose,
  onSubmitted,
}: {
  businesses: JoinableBusiness[];
  onClose: () => void;
  /** Fired after a successful request so the parent can `router.refresh()` its own list. */
  onSubmitted?: () => void;
}) {
  const { copy } = useLanguage();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const selectableBusinesses = businesses.filter((business) => business.pendingRequestStatus !== 'PENDING');
  const [selectedId, setSelectedId] = useState(selectableBusinesses[0]?.id ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const visibleBusinesses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return businesses;
    return businesses.filter((business) =>
      [business.name, business.area, business.categoryName].join(' ').toLocaleLowerCase().includes(normalizedQuery),
    );
  }, [businesses, query]);
  const selectedBusiness = businesses.find((business) => business.id === selectedId) ?? null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBusiness || isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const result = await sendJoinRequest({ businessId: selectedBusiness.id });

      if (!result.ok) {
        setFormError(result.error.message);
        return;
      }

      setSubmitted(true);
      router.refresh();
      onSubmitted?.();
    } finally {
      setIsSubmitting(false);
    }
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
            className={`${actionIconButton} h-10 w-10 rounded-full`}
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
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              {copy.joinBusiness.submittedDescription}
            </p>
            <button
              type="button"
              onClick={onClose}
              className={`${actionButton} mt-7 rounded-2xl px-5 py-3 text-sm`}
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
                    <Search
                      className="pointer-events-none absolute inset-y-0 start-4 my-auto h-5 w-5 text-[var(--muted)]"
                      aria-hidden="true"
                    />
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
                          const alreadyRequested = business.pendingRequestStatus === 'PENDING';

                          return (
                            <button
                              key={business.id}
                              type="button"
                              disabled={alreadyRequested}
                              onClick={() => setSelectedId(business.id)}
                              // A row here is a list option, not an action button, so it keeps the
                              // white/selected split — but hover follows the same rule as every
                              // other control in this area: pointer cursor, blue.
                              className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl p-3 text-right transition-colors hover:bg-[var(--brand-blue)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-white disabled:hover:text-[var(--foreground)] ${
                                selected
                                  ? 'bg-[var(--brand-blue-dark)] text-white shadow-lg'
                                  : 'bg-white text-[var(--foreground)]'
                              }`}
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current">
                                {selected ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : null}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-extrabold">{business.name}</p>
                                <p
                                  className={`mt-0.5 truncate text-xs ${
                                    selected ? 'text-white/75' : 'text-[var(--muted)]'
                                  }`}
                                >
                                  {[business.categoryName, business.area].filter(Boolean).join(' · ')}
                                </p>
                              </div>
                              {alreadyRequested ? (
                                <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                                  {copy.joinBusiness.alreadyRequested}
                                </span>
                              ) : null}
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
              <p className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-800">
                {copy.joinBusiness.notice}
              </p>
            </section>

            {formError ? (
              <p role="alert" className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {formError}
              </p>
            ) : null}

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!selectedBusiness || selectedBusiness.pendingRequestStatus === 'PENDING' || isSubmitting}
                className={`${actionButton} rounded-2xl px-5 py-3 text-sm shadow-lg`}
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                {isSubmitting ? copy.joinBusiness.submitting : copy.joinBusiness.submit}
              </button>
              <button
                type="button"
                onClick={onClose}
                className={`${actionButton} rounded-2xl px-5 py-3 text-sm`}
              >
                {copy.joinBusiness.cancel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function SelectedBusinessCard({ business, label }: { business: JoinableBusiness | null; label: string }) {
  if (!business) return null;

  return (
    <aside className="flex h-full flex-col rounded-3xl border border-[#cfcaff] bg-[#f4f2ff] p-5 text-right">
      <p className="text-sm font-bold text-[var(--brand)]">{label}</p>
      <h4 className="mt-4 text-base font-extrabold text-[var(--foreground)]">{business.name}</h4>
      <p className="mt-1 flex items-center gap-1 text-sm text-[var(--muted)]">
        <MapPin className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
        {business.area}
      </p>
      <p className="mt-3 flex items-center gap-1 text-sm text-[var(--muted)]">
        <Users className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
        {business.employeeCount}
      </p>
      <p className="mt-auto border-t border-[#dcd8ff] pt-4 text-sm font-semibold text-[var(--brand)]">
        {business.categoryName}
      </p>
    </aside>
  );
}
