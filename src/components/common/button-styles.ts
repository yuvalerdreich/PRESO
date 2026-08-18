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
 * Sizing (padding, radius, text size) stays at the call site — only colour and interaction live
 * here, so a chip and a wizard's submit button can differ in shape while never differing in colour.
 */

/** Filled action button/link: the base every button in these two areas shares. */
export const actionButton =
  'inline-flex items-center justify-center gap-2 cursor-pointer font-bold text-white bg-[var(--brand-blue-dark)] transition-colors hover:bg-[var(--brand-blue)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[var(--brand-blue-dark)]';

/** Added to `actionButton` for a selected tab — a ring, not a different colour. */
export const actionButtonSelected = 'ring-2 ring-white/80';

/** Icon-only control (a dialog's close X): no fill at rest, same blue on hover. */
export const actionIconButton =
  'inline-flex items-center justify-center cursor-pointer text-[var(--muted)] transition-colors hover:bg-[var(--soft-violet)] hover:text-[var(--brand-blue)]';

/** Inline text action inside a form section (e.g. "add service"). */
export const actionTextButton =
  'inline-flex items-center gap-2 cursor-pointer font-bold text-[var(--brand-blue-dark)] transition-colors hover:text-[var(--brand-blue)]';
