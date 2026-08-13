'use client';

import Link from 'next/link';
import { ArrowUpLeft, Building2, UserPlus } from 'lucide-react';
import { useState } from 'react';

import { CreateBusinessDialog } from '@/components/business/create-business-dialog';
import { OnboardingChoiceCard } from '@/components/business/onboarding-choice-card';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { BusinessEntryArea, BusinessEntryCategory } from '@/types/business-entry';

export function OnboardingPage({ areas, categories }: { areas: BusinessEntryArea[]; categories: BusinessEntryCategory[] }) {
  const { copy } = useLanguage();
  const entry = copy.businessEntry;
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 sm:py-10 lg:py-12">
      <section className="relative isolate overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_12%_13%,rgba(126,99,255,.45)_0,transparent_27%),radial-gradient(circle_at_90%_90%,rgba(183,85,255,.23)_0,transparent_29%),linear-gradient(118deg,#151c47_0%,#111933_50%,#38206f_100%)] px-6 py-12 text-white shadow-[0_24px_50px_rgba(33,37,93,.2)] sm:px-10 sm:py-15">
        <div className="pointer-events-none absolute -end-24 -top-28 size-80 rounded-full border border-violet-200/15" />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="inline-flex rounded-full border border-violet-200/30 bg-white/[.07] px-4 py-2 text-sm font-bold text-violet-100">{entry.eyebrow}</p>
          <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl">{entry.title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-indigo-100 sm:text-lg">{entry.description}</p>
        </div>
      </section>

      <section className="mx-auto mt-8 grid max-w-4xl gap-5 md:grid-cols-2" aria-label={entry.title}>
        <OnboardingChoiceCard icon={Building2} title={entry.createTitle} description={entry.createDescription} tone="violet">
          <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(82,56,247,.22)] transition hover:bg-[var(--brand-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"><Building2 aria-hidden="true" size={17} />{entry.createAction}</button>
        </OnboardingChoiceCard>
        <OnboardingChoiceCard icon={UserPlus} title={entry.joinTitle} description={entry.joinDescription} tone="indigo">
          <Link href="/join" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(49,46,129,.2)] transition hover:bg-indigo-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"><UserPlus aria-hidden="true" size={17} />{entry.joinAction}<ArrowUpLeft aria-hidden="true" size={16} /></Link>
        </OnboardingChoiceCard>
      </section>

      <CreateBusinessDialog areas={areas} categories={categories} isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </main>
  );
}
