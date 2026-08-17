'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PresoLogo } from '@/components/common/preso-logo';
import { useProfileSettings } from '@/components/common/profile-settings-context';
import { useLanguage } from '@/lib/i18n/language-provider';
import { createClient } from '@/lib/supabase/client';

export function PublicHeader({
  currentUser = null,
}: {
  currentUser?: { fullName: string } | null;
}) {
  const { copy } = useLanguage();
  const { open: openProfileSettings } = useProfileSettings();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="border-b border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <PresoLogo />

        <div className="flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openProfileSettings}
                className="text-sm font-medium text-[var(--foreground)] hover:underline"
              >
                {copy.header.greeting} {currentUser.fullName}
              </button>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--soft-violet)] disabled:opacity-60"
              >
                {copy.header.logout}
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--soft-violet)]"
            >
              {copy.header.signIn}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
