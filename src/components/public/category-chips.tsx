'use client';

import { Dumbbell, GraduationCap, Scissors, Sparkles, Stethoscope, Wand2, type LucideIcon } from 'lucide-react';

import { actionButton, actionButtonSelectedOnLight } from '@/components/common/button-styles';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { Category, CategoryIconId } from '@/types/domain';

const ICONS: Record<CategoryIconId, LucideIcon> = {
  'graduation-cap': GraduationCap,
  stethoscope: Stethoscope,
  dumbbell: Dumbbell,
  sparkles: Sparkles,
  scissors: Scissors,
};

// Same one-colour rule as the business area's filter chips, on the light page background — so the
// selected ring is blue rather than white (components/common/button-styles.ts).
function chipClassName(active: boolean) {
  return `${actionButton} rounded-full px-4 py-2 text-sm ${active ? actionButtonSelectedOnLight : ''}`;
}

export function CategoryChips({
  categories,
  selectedCategoryId,
  onSelect,
}: {
  categories: Category[];
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
}) {
  const { copy, locale } = useLanguage();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => onSelect(null)}
        aria-pressed={selectedCategoryId === null}
        className={chipClassName(selectedCategoryId === null)}
      >
        <span>{copy.discovery.categoryPlaceholder}</span>
        <Wand2 className="h-4 w-4" aria-hidden="true" />
      </button>

      {categories.map((category) => {
        const Icon = ICONS[category.icon];
        const active = selectedCategoryId === category.id;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            aria-pressed={active}
            className={chipClassName(active)}
          >
            <span>{category.name[locale]}</span>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
