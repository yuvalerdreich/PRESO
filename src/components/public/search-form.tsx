'use client';

import { ChevronDown, Search } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';

/**
 * Plain GET form to `/search` — the browser builds the query string, so this
 * needs no router/JS and renders fine outside an app-router context (tests).
 */
export function SearchForm() {
  const { copy } = useLanguage();

  return (
    <form
      action="/search"
      method="get"
      className="flex flex-col gap-3 rounded-2xl bg-white/10 p-2 sm:flex-row sm:items-center"
    >
      <div className="relative sm:w-64 sm:shrink-0">
        <select
          name="area"
          defaultValue=""
          aria-label={copy.discovery.areaPlaceholder}
          className="w-full appearance-none rounded-xl bg-white/10 px-4 py-3 text-sm text-white outline-none"
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
          className="pointer-events-none absolute inset-y-0 my-auto h-4 w-4 text-white/50 ltr:left-4 rtl:right-4"
          aria-hidden="true"
        />
        <input
          type="search"
          name="q"
          placeholder={copy.discovery.searchPlaceholder}
          aria-label={copy.discovery.searchPlaceholder}
          className="w-full rounded-xl bg-white/10 py-3 text-sm text-white placeholder-white/50 outline-none ltr:pl-11 ltr:pr-4 rtl:pr-11 rtl:pl-4"
        />
      </div>
    </form>
  );
}
