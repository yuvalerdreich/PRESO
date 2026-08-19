'use client';

import { useRef } from 'react';
import { ChevronDown, Search } from 'lucide-react';

import { actionButton, actionButtonChipNoInline } from '@/components/common/button-styles';
import { fieldPaddingLeftIcon, heroField } from '@/components/common/field-styles';
import { useLanguage } from '@/lib/i18n/language-provider';

/**
 * The discovery search controls, styled as a `PanelHero` control row — the same slot the business
 * area's action buttons and the appointments tabs occupy, using the shared field classes so size,
 * radius, type scale and focus ring match those screens.
 *
 * Controlled, and no submit button: typing filters the grid underneath in place (§12.43), so there
 * is nothing to submit and no second screen to navigate to. The single magnifying glass sits on the
 * physical left edge in both writing directions — the field's trailing edge in Hebrew, its leading
 * edge in English — because one glass on one side is what the design asks for, mirrored or not.
 *
 * The glass is a real button: with no submit to perform it puts the caret in the field and selects
 * what is there, which is what clicking a search icon on an already-filtering box should do.
 */
/**
 * `cursor-pointer` here reaches only the browsers that draw the option list in-page (Firefox, and
 * Chrome's own `appearance:base-select` opt-in). Where the popup is drawn by the OS — Chrome and
 * Safari on Windows and macOS today — the cursor is the platform's to choose and no CSS applies.
 * The control itself carries the pointer either way, via `actionButton`.
 */
const optionClassName = 'cursor-pointer bg-white font-medium text-[var(--foreground)]';

export function SearchForm({
  areas = [],
  query,
  area,
  onQueryChange,
  onAreaChange,
}: {
  /** Cities that actually have a business (`listBusinessAreas()`); empty renders "all areas" only. */
  areas?: string[];
  query: string;
  area: string;
  onQueryChange: (value: string) => void;
  onAreaChange: (value: string) => void;
}) {
  const { copy } = useLanguage();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div role="search" className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* The area picker is a *choice*, not something you type into — so it wears the button
          treatment its equivalents wear on the other screens (the filter tabs on "העסקים שלי",
          the section links on the dashboard), not the translucent field treatment of the search
          box beside it. Only the free-text query stays a field. */}
      <div className="relative sm:w-64 sm:shrink-0">
        <select
          name="area"
          value={area}
          onChange={(event) => onAreaChange(event.target.value)}
          aria-label={copy.discovery.areaPlaceholder}
          // `picker-select` (globals.css) is what lets the option list below be styled at all —
          // without it the popup belongs to the OS and drops every rule, cursor included.
          className={`picker-select ${actionButton} ${actionButtonChipNoInline} w-full appearance-none ps-3.5 pe-9 font-bold`}
        >
          {/* The native dropdown inherits the control's own background, and the control is now a
              dark blue button — which left dark option text on a dark list. Each option states the
              white surface it is really drawn on. */}
          <option value="" className={optionClassName}>
            {copy.discovery.areaPlaceholder}
          </option>
          {areas.map((option) => (
            <option key={option} value={option} className={optionClassName}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute inset-y-0 my-auto h-4 w-4 text-white ltr:right-3.5 rtl:left-3.5"
          aria-hidden="true"
        />
      </div>

      <div className="relative flex-1">
        <button
          type="button"
          aria-label={copy.discovery.searchButton}
          onClick={() => {
            inputRef.current?.focus();
            inputRef.current?.select();
          }}
          className="absolute inset-y-0 left-2 my-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
        </button>
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={copy.discovery.searchPlaceholder}
          aria-label={copy.discovery.searchPlaceholder}
          className={`${heroField} ${fieldPaddingLeftIcon}`}
        />
      </div>
    </div>
  );
}
