import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

type OnboardingChoiceCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
  tone: 'violet' | 'indigo';
};

export function OnboardingChoiceCard({ icon: Icon, title, description, children, tone }: OnboardingChoiceCardProps) {
  const accents = tone === 'violet'
    ? 'bg-violet-50 text-[var(--brand)] group-hover:bg-[var(--brand)] group-hover:text-white'
    : 'bg-indigo-50 text-indigo-700 group-hover:bg-indigo-700 group-hover:text-white';

  return (
    <article className="group rounded-[1.8rem] border border-[var(--line)] bg-white p-6 shadow-[0_12px_30px_rgba(37,42,92,.07)] transition duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_20px_40px_rgba(69,54,180,.13)] sm:p-7">
      <span className={`inline-flex size-14 items-center justify-center rounded-2xl transition ${accents}`}><Icon aria-hidden="true" size={25} strokeWidth={2.2} /></span>
      <h2 className="mt-5 text-2xl font-black tracking-tight">{title}</h2>
      <p className="mt-3 min-h-12 text-sm leading-6 text-[var(--muted)]">{description}</p>
      <div className="mt-6">{children}</div>
    </article>
  );
}
