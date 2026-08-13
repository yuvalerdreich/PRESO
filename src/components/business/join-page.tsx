'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { JoinBusinessForm } from '@/components/business/join-business-form';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { JoinableBusiness } from '@/types/business-entry';

export function JoinPage({ businesses }: { businesses: JoinableBusiness[] }) {
  const { copy } = useLanguage();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-7 sm:px-6 sm:py-10 lg:py-12">
      <Link href="/onboarding" className="inline-flex items-center gap-2 rounded-xl px-2 py-2 text-sm font-bold text-[var(--brand)] transition hover:bg-[var(--soft-violet)] hover:text-[var(--brand-deep)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"><ArrowLeft aria-hidden="true" size={17} className="rtl:rotate-180" />{copy.businessEntry.backToOnboarding}</Link>
      <div className="mt-4"><JoinBusinessForm businesses={businesses} /></div>
    </main>
  );
}
