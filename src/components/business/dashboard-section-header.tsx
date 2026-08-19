import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * The heading over a list inside the dashboard shell.
 *
 * Same anatomy as the appointment diary's — a brand-coloured mark, the title, the count folded into
 * the title string — with the subject's own icon in place of that screen's dot, because a screen
 * carrying two lists has to let you tell them apart at a glance. `action` is the screen's one
 * primary control ("add a new service"), which sits opposite the title rather than above the list,
 * so the list itself starts at the same place on every screen.
 */
export function DashboardSectionHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <Icon className="h-5 w-5 shrink-0 text-[var(--brand)]" aria-hidden="true" />
          <h2 className="text-base font-extrabold text-[var(--foreground)]">{title}</h2>
        </div>
        <p className="text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>
      {action}
    </div>
  );
}
