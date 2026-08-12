'use client';

import Link from 'next/link';
import { Dumbbell, Scissors, Sparkles, Stethoscope, GraduationCap } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { DiscoveryCategory } from '@/types/domain';

const categoryIcons = {
  'hair-beauty': Scissors,
  cosmetics: Sparkles,
  fitness: Dumbbell,
  clinics: Stethoscope,
  consulting: GraduationCap,
} as const;

export function CategoryChips({ categories }: { categories: DiscoveryCategory[] }) {
  const { locale, copy } = useLanguage();

  return (
    <section aria-labelledby="category-heading">
      <h2 id="category-heading" className="sr-only">{copy.discovery.categoriesTitle}</h2>
      <div className="flex flex-wrap justify-center gap-3">
        {categories.map((category) => {
          const Icon = categoryIcons[category.id as keyof typeof categoryIcons] ?? Sparkles;
          return (
            <Link
              key={category.id}
              href={`/search?category=${category.slug}`}
              className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm font-semibold text-[#243660] shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-[var(--brand)]"
            >
              <Icon aria-hidden="true" size={17} className="text-[var(--brand)]" />
              {category.name[locale]}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
