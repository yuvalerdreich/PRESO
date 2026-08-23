import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const refreshMock = vi.fn();
const signInWithPasswordMock = vi.fn();
const getUserMock = vi.fn();
const signOutMock = vi.fn();
const singleMock = vi.fn();
const eqMock = vi.fn(() => ({ single: singleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: signInWithPasswordMock,
      getUser: getUserMock,
      signOut: signOutMock,
    },
    from: fromMock,
  }),
}));

import { LoginForm } from '@/components/auth/login-form';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import { translations } from '@/lib/i18n/translations';

function renderForm(onSuccess = vi.fn()) {
  render(
    <LanguageProvider initialLocale="en">
      <LoginForm onSuccess={onSuccess} />
    </LanguageProvider>,
  );
  return onSuccess;
}

describe('login form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithPasswordMock.mockResolvedValue({ error: null });
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    singleMock.mockResolvedValue({ data: { account_type: 'CLIENT', status: 'ACTIVE' } });
  });

  it('notifies the auth modal after a successful password sign-in', async () => {
    const onSuccess = renderForm();

    fireEvent.change(screen.getByLabelText(translations.en.auth.emailLabel), {
      target: { value: 'lee@example.com' },
    });
    fireEvent.change(screen.getByLabelText(translations.en.auth.passwordLabel), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: translations.en.auth.loginSubmit }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce());
    expect(pushMock).toHaveBeenCalledWith('/');
    expect(refreshMock).toHaveBeenCalledOnce();
  });
});
