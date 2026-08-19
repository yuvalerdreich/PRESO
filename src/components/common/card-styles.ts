/**
 * Card treatment — the third shared-style module, next to `button-styles.ts` and `field-styles.ts`.
 *
 * Every screen in the app lists *things in boxes*: businesses to book on `/`, businesses you work
 * at on `/businesses`, appointments in the client panel. Those three grew their own radius, shadow,
 * padding and title weight, so the same object looked like a different kind of object depending on
 * which screen you reached it from. This is the one definition of that box.
 *
 * The rule that follows `button-styles.ts`: a card's primary action is the same filled blue pill
 * everywhere (`actionButton` + `cardAction`), never a bare coloured text link on one screen and a
 * button on another. Colour still carries meaning in exactly one place — `cardChip`, whose *shape*
 * is fixed here while its palette stays with the call site, because "owner" / "pending" / a category
 * are genuinely different statements.
 *
 * Sizing that is specific to a card's content (grid columns, photo aspect ratio) stays at the call
 * site; only the shell, the type scale and the action shape live here.
 */

const shell = 'rounded-3xl border border-[var(--line)] bg-white shadow-[0_16px_35px_-28px_rgba(23,27,70,0.55)]';

/** A card that is read, not clicked — a row in a list of things you already own. */
export const surfaceCard = `flex flex-col ${shell}`;

/**
 * The card's answer to the pointer: rise slightly, deepen the shadow, come forward of its
 * neighbours. Its own export because it is not only for cards that are *entirely* a link — a card
 * whose action is a button inside it responds the same way, so hovering a business feels the same
 * on `/` and on `/businesses`.
 */
export const cardHoverLift =
  'transition-all duration-200 hover:z-10 hover:-translate-y-1 hover:shadow-[0_26px_45px_-26px_rgba(23,27,70,0.7)]';

/**
 * A card that is itself a destination. `group` + `relative` are part of the contract: the photo
 * scales on `group-hover`, and `cardStretchedLink` positions against this element.
 */
export const surfaceCardInteractive = `group relative flex flex-col overflow-hidden ${shell} ${cardHoverLift}`;

export const cardTitle = 'truncate text-base font-extrabold text-[var(--foreground)]';

/** The line under the title that says what kind of thing this is — a category, a role. */
export const cardSubtitle = 'text-sm font-semibold text-[var(--brand)]';

/** Status pill. Shape only: the call site adds the background/foreground pair that carries meaning. */
export const cardChip = 'w-fit shrink-0 rounded-full px-3 py-1 text-xs font-bold';

/** The category chip, the one chip whose colour is fixed — it is the brand, not a status. */
export const cardChipBrand = `${cardChip} bg-[var(--brand)] text-white shadow-sm`;

/** The tinted block of address / team-size / contact lines. */
export const cardMetaList = 'grid gap-2 rounded-2xl border border-[var(--line)] bg-slate-50/70 p-3 text-sm';

export const cardMetaRow = 'flex items-center gap-2 text-[var(--muted)]';

export const cardMetaIcon = 'h-4 w-4 shrink-0 text-[var(--brand)]';

/** Sizing for a card's primary action. Always used with `actionButton` — never on its own. */
export const cardAction = 'rounded-full px-4 py-2 text-sm';

/**
 * Turns the card's single action link into the whole card's hit area, so the card stays clickable
 * end to end without nesting a `<Link>` inside a `<Link>` — which is invalid HTML and gave the
 * booking card two overlapping tab stops. Requires `surfaceCardInteractive`'s `relative`, and only
 * ever on **one** link per card.
 */
export const cardStretchedLink = "after:absolute after:inset-0 after:content-['']";
