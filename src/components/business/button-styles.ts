/**
 * One button treatment for the whole business area (`(business)/*` screens and their dialogs).
 *
 * The rule, requested explicitly: every button rests at the same colour (`--brand`), and **hover is
 * the only state that changes it** — to `--brand-blue`, together with the pointer cursor Tailwind
 * v4's preflight strips off `<button>` by default. Emphasis that used to be carried by a second
 * colour (a selected filter tab, a "secondary" cancel button) is carried by a ring instead, so the
 * one-colour rule holds without losing the state it encoded.
 *
 * Sizing (padding, radius, text size) stays at the call site — only colour and interaction live
 * here, so a chip and a wizard's submit button can differ in shape while never differing in colour.
 */

/** Filled action button/link: the base every business-area button shares. */
export const businessButton =
  'inline-flex items-center justify-center gap-2 cursor-pointer font-bold text-white bg-[var(--brand)] transition-colors hover:bg-[var(--brand-blue)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[var(--brand)]';

/** Added to `businessButton` for a selected tab — a ring, not a different colour. */
export const businessButtonSelected = 'ring-2 ring-white/80';

/** Icon-only control (a dialog's close X): no fill at rest, same blue on hover. */
export const businessIconButton =
  'inline-flex items-center justify-center cursor-pointer text-[var(--muted)] transition-colors hover:bg-[var(--soft-violet)] hover:text-[var(--brand-blue)]';

/** Inline text action inside a form section (e.g. "add service"). */
export const businessTextButton =
  'inline-flex items-center gap-2 cursor-pointer font-bold text-[var(--brand)] transition-colors hover:text-[var(--brand-blue)]';
