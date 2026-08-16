import { PresoLogo } from '@/components/common/preso-logo';

// (auth) is a route group — it contributes no URL segment of its own, so there's no
// LayoutRoutes entry that represents it precisely. '/' is a placeholder, same convention
// already used by (business)/layout.tsx for the same reason; `params` isn't used here.
export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 bg-[var(--soft-violet)] px-4 py-12">
      <PresoLogo />
      <div className="w-full max-w-md rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-sm sm:p-8">
        {children}
      </div>
    </div>
  );
}
