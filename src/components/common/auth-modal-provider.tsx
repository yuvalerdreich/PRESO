'use client';

import { useState, type ReactNode } from 'react';

import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';
import { LoginForm } from '@/components/auth/login-form';
import { SignupForm } from '@/components/auth/signup-form';
import { AuthModalContext } from '@/components/common/auth-modal-context';
import { Modal } from '@/components/common/modal';
import { useLanguage } from '@/lib/i18n/language-provider';

/**
 * Shares the sign-in/forgot-password/signup modal across every place that needs to ask a
 * signed-out visitor to log in — the header's own "sign in" button, and (since guests can browse
 * but not book) the "sign in to book" dialog on the business/employee pages. Same shape as
 * AppointmentsPanelProvider: one instance owned here, opened from wherever via context, rather
 * than each caller growing its own copy of the modal.
 */
export function AuthModalProvider({ children }: { children: ReactNode }) {
  const { copy } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'forgot-password' | 'signup'>('login');
  const [next, setNext] = useState<string | undefined>(undefined);

  function openLogin(nextHref?: string) {
    setNext(nextHref);
    setAuthView('login');
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
    setAuthView('login');
    setNext(undefined);
  }

  return (
    <AuthModalContext.Provider value={{ openLogin }}>
      {children}

      {isOpen ? (
        <Modal
          onClose={close}
          closeLabel={copy.common.close}
          ariaLabel={
            authView === 'login'
              ? copy.auth.loginTitle
              : authView === 'forgot-password'
                ? copy.auth.forgotTitle
                : copy.auth.signupTitle
          }
        >
          {authView === 'login' ? (
            <LoginForm
              next={next}
              onForgotPassword={() => setAuthView('forgot-password')}
              onSignup={() => setAuthView('signup')}
            />
          ) : authView === 'forgot-password' ? (
            <ForgotPasswordForm onBackToLogin={() => setAuthView('login')} />
          ) : (
            <SignupForm onLogin={() => setAuthView('login')} />
          )}
        </Modal>
      ) : null}
    </AuthModalContext.Provider>
  );
}
