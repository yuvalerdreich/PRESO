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
      <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
        {categories.map((category) => {
          const Icon = categoryIcons[category.id as keyof typeof categoryIcons] ?? Sparkles;
          return (
            <Link
              key={category.id}
              href={`/search?category=${category.slug}`}
              className="group inline-flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white px-3.5 py-2.5 text-sm font-bold text-[#354264] shadow-[0_3px_10px_rgba(36,42,91,.04)] transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50 hover:text-[var(--brand)] hover:shadow-[0_10px_20px_rgba(81,63,214,.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            >
              <span className="inline-flex size-7 items-center justify-center rounded-lg bg-violet-50 text-[var(--brand)] transition group-hover:bg-white">
                <Icon aria-hidden="true" size={15} />
              </span>
              {category.name[locale]}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
