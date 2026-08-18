'use client';

import { ChevronDown, Search } from 'lucide-react';

import { actionButton } from '@/components/common/button-styles';
import { fieldPaddingEndIcon, fieldPaddingStartIcon, heroField } from '@/components/common/field-styles';
import { useLanguage } from '@/lib/i18n/language-provider';

/**
 * Plain GET form to `/search` — the browser builds the query string, so this
 * needs no router/JS and renders fine outside an app-router context (tests).
 *
 * Styled as a `PanelHero` control row, the same slot the business area's action buttons and the
 * appointments tabs occupy: shared field and button classes, so size, radius, type scale, focus
 * ring and hover all match those screens rather than being tuned by hand here.
 */
export function SearchForm() {
  const { copy } = useLanguage();

  return (
    <form action="/search" method="get" className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative sm:w-64 sm:shrink-0">
        <select
          name="area"
          defaultValue=""
          aria-label={copy.discovery.areaPlaceholder}
          className={`${heroField} ${fieldPaddingEndIcon} cursor-pointer appearance-none font-semibold`}
        >
          <option value="" className="text-[var(--foreground)]">
            {copy.discovery.areaPlaceholder}
          </option>
        </select>
        <ChevronDown
          className="pointer-events-none absolute inset-y-0 my-auto h-4 w-4 text-white/70 ltr:right-4 rtl:left-4"
          aria-hidden="true"
        />
      </div>

      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute inset-y-0 my-auto h-4 w-4 text-white/60 ltr:left-4 rtl:right-4"
          aria-hidden="true"
        />
        <input
          type="search"
          name="q"
          placeholder={copy.discovery.searchPlaceholder}
          aria-label={copy.discovery.searchPlaceholder}
          className={`${heroField} ${fieldPaddingStartIcon}`}
        />
      </div>

      <button type="submit" className={`${actionButton} rounded-2xl px-5 py-3 text-sm`}>
        <Search className="h-4 w-4" aria-hidden="true" />
        {copy.discovery.searchButton}
      </button>
    </form>
  );
}
