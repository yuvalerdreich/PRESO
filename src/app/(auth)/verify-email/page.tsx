import Link from 'next/link';
import { cookies } from 'next/headers';

import { LOCALE_COOKIE_KEY } from '@/lib/i18n/language-provider';
import { translations } from '@/lib/i18n/translations';
import { isLocale } from '@/lib/i18n/types';

/**
 * Static landing page for a `type=signup` callback (TECHNICAL_DESIGN.md §12.9) — verification
 * is encouraged, not gating, so this page has no functional check of its own. Server
 * component with no interactivity, so it reads the locale cookie directly (same as
 * app/layout.tsx) instead of pulling in the client-only useLanguage() hook.
 */
export default async function VerifyEmailPage() {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_KEY)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : 'he';
  const copy = translations[locale].auth;

  return (
    <div className="flex flex-col gap-4 text-center">
      <h1 className="text-xl font-bold text-[var(--foreground)]">{copy.verifyEmailTitle}</h1>
      <p className="text-sm text-[var(--muted)]">{copy.verifyEmailBody}</p>
      <Link href="/" className="text-sm font-medium text-[var(--brand)] hover:underline">
        {copy.backToHome}
      </Link>
    </div>
  );
}
