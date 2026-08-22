'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { LoginForm } from '@/components/auth/login-form';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { Modal } from '@/components/common/modal';
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
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'forgot-password'>('login');

  function closeLoginModal() {
    setIsLoginOpen(false);
    setAuthView('login');
  }

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  return (
    <header className="border-b border-[var(--line)] bg-[var(--surface)]">
      {/* Full-bleed, not `max-w-6xl mx-auto`: the brand belongs hard against one edge of the
          window and the account controls against the other, so the row cannot float in from the
          sides as the viewport grows. Order is direction-aware for free — the logo is the first
          flex child, which is the right edge in Hebrew and the left in English. */}
      <div className="flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6">
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
            <button
              type="button"
              onClick={() => {
                setAuthView('login');
                setIsLoginOpen(true);
              }}
              className="rounded-full px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--soft-violet)]"
            >
              {copy.header.signIn}
            </button>
          )}
        </div>
      </div>
      {isLoginOpen ? (
        <Modal
          onClose={closeLoginModal}
          closeLabel={copy.common.close}
          ariaLabel={authView === 'login' ? copy.auth.loginTitle : copy.auth.forgotTitle}
        >
          {authView === 'login' ? (
            <LoginForm onForgotPassword={() => setAuthView('forgot-password')} />
          ) : (
            <ForgotPasswordForm onBackToLogin={() => setAuthView('login')} />
          )}
        </Modal>
      ) : null}
    </header>
  );
}
