import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * The dark banner every top-level screen opens with — "העסקים שלי", "התורים שלי", and the home
 * search. It was copied twice before the third screen needed it; this is the one definition of the
 * gradient, the corner radius, the icon badge, and the title/description type scale, so the three
 * can no longer drift apart.
 *
 * Layout is deliberately start-aligned rather than centred: title and description on the reading
 * side, the icon badge opposite, and `children` — the screen's own controls (action buttons, tabs,
 * a search form) — on a row below a hairline divider. Anything rendered there should use
 * `components/common/button-styles.ts` and `field-styles.ts` so the controls match too.
 */
export function PanelHero({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  /** The screen's controls. Omit it and the divider disappears with them. */
  children?: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#30257b] via-[#1e2857] to-[#111938] px-5 py-7 text-white shadow-[0_24px_45px_-30px_rgba(23,27,70,0.85)] sm:px-8 sm:py-9">
      <div
        className={`flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between ${
          children ? 'border-b border-white/10 pb-6' : ''
        }`}
      >
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{description}</p>
        </div>
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#7169ef] bg-[#4237aa] text-[#a8b0ff] shadow-inner">
          <Icon className="h-7 w-7" aria-hidden="true" />
        </span>
      </div>

      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}
