/**
 * Input / select / textarea treatment, the companion to `button-styles.ts`. Three surfaces, one
 * size and one type scale: `surfaceField` for a white card or the page background,
 * `surfaceFieldSubtle` for a field inside a white dialog (where a pure-white input would disappear
 * into its panel), and `heroField` for the dark `PanelHero`. All three focus to the same blue the
 * buttons hover to, so a screen reads as one system whichever surface a field lands on.
 *
 * Padding is a separate export rather than baked in. A leading search icon and a trailing chevron
 * need different insets, and stacking `ps-11` on top of a base `px-4` leaves two competing
 * padding-inline declarations whose winner depends on stylesheet order — so each call site picks
 * exactly one complete padding set.
 */

const core = 'w-full rounded-2xl border text-sm outline-none transition-colors focus:ring-2';
const light = 'border-[var(--line)] text-[var(--foreground)] placeholder:text-[var(--muted)]';
const focusBlue = 'focus:border-[var(--brand-blue)] focus:ring-[var(--brand-blue)]/15';

/** Field on a light surface — white card, page background. */
export const surfaceField = `${core} ${light} ${focusBlue} bg-white shadow-sm`;

/** Same field inside a white dialog, tinted so its edges still read. */
export const surfaceFieldSubtle = `${core} ${light} ${focusBlue} bg-slate-50`;

/** Same field inside a `PanelHero`'s dark gradient. */
export const heroField = `${core} border-white/15 bg-white/10 text-white placeholder:text-white/60 focus:border-[var(--brand-blue)] focus:ring-[var(--brand-blue)]/40`;

/** Plain field, no adornment. */
export const fieldPadding = 'px-4 py-3';

/** Field with an icon pinned to the inline-start edge (a search glass). */
export const fieldPaddingStartIcon = 'py-3 ps-11 pe-4';

/** Field with an icon pinned to the inline-end edge (a select's chevron). */
export const fieldPaddingEndIcon = 'py-3 ps-4 pe-11';

/**
 * Field whose icon sits on the **physical** left in both writing directions — the home search box,
 * where the design calls for one magnifying glass on the left whatever the language.
 */
export const fieldPaddingLeftIcon = 'py-3 pl-11 pr-4';
