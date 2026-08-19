/**
 * One button treatment, shared by the business area (`(business)/*`) and the client's
 * "my appointments" panel (`components/client/*`). It started under `components/business/`; it
 * moved here — §3's bucket for anything both portals render — the moment the second area adopted it.
 *
 * The rule, requested explicitly: every button rests at the same dark blue (`--brand-blue-dark`),
 * and **hover is the only state that changes it** — lightening to `--brand-blue`, together with the
 * pointer cursor Tailwind v4's preflight strips off `<button>` by default. Both steps keep white
 * text above 4.5:1, so the label stays legible in either state. Emphasis that used to be carried by
 * a second colour (a selected filter tab, a "secondary" cancel button) is carried by a ring instead,
 * so the one-colour rule holds without losing the state it encoded.
 *
 * Colour and interaction are the base; the two **shapes** below are the sizes that repeat across
 * screens — a control-row chip and a hero's primary action. Anything genuinely one-off (a card's
 * round action pill, a dialog's full-width submit) still sizes itself at the call site.
 */

/** Filled action button/link: the base every button in these two areas shares. */
export const actionButton =
  'inline-flex items-center justify-center gap-2 cursor-pointer font-bold text-white bg-[var(--brand-blue-dark)] transition-colors hover:bg-[var(--brand-blue)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[var(--brand-blue-dark)]';

/**
 * A control-row button: a filter tab, a category chip, a dashboard section link, the home hero's
 * area picker. One shape for all of them — the category chips were the odd row out as fully-round
 * pills while every equivalent row elsewhere was a soft rectangle.
 */
export const actionButtonChip = 'rounded-2xl px-3.5 py-2 text-sm';

/**
 * The same chip with its inline padding left off, for a control that has to set its own — a
 * `<select>` with a chevron inset needs `ps-4 pe-10`, and stacking that on `px-4` would leave two
 * competing `padding-inline` declarations whose winner depends on stylesheet order (the same trap
 * `field-styles.ts` documents).
 */
export const actionButtonChipNoInline = 'rounded-2xl py-2 text-sm';

/** The primary action in a hero control row — the same shape, one step taller. */
export const actionButtonLarge = 'rounded-2xl px-4 py-2.5 text-sm';

/** Added to `actionButton` for a selected tab on a dark panel — a ring, not a different colour. */
export const actionButtonSelected = 'ring-2 ring-white/80';

/** Same idea for a selected chip sitting on the light page background, where white would vanish. */
export const actionButtonSelectedOnLight =
  'ring-2 ring-[var(--brand-blue)] ring-offset-2 ring-offset-[var(--background)]';

/** Icon-only control (a dialog's close X): no fill at rest, same blue on hover. */
export const actionIconButton =
  'inline-flex items-center justify-center cursor-pointer text-[var(--muted)] transition-colors hover:bg-[var(--soft-violet)] hover:text-[var(--brand-blue)]';

/** Inline text action inside a form section (e.g. "add service"). */
export const actionTextButton =
  'inline-flex items-center gap-2 cursor-pointer font-bold text-[var(--brand-blue-dark)] transition-colors hover:text-[var(--brand-blue)]';
