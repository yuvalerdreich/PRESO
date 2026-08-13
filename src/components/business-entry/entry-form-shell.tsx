import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type EntryFormShellProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
};

export function EntryFormShell({ icon: Icon, title, description, children }: EntryFormShellProps) {
  return (
    <section className="rounded-[1.75rem] border border-[var(--line)] bg-white p-5 shadow-[0_16px_38px_rgba(37,42,92,.08)] sm:p-7">
      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-[var(--brand)]"><Icon aria-hidden="true" size={23} strokeWidth={2.3} /></span>
      <h1 className="mt-4 text-2xl font-black tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
      {children}
    </section>
  );
}
