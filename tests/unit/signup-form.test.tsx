import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pushMock = vi.fn();
const refreshMock = vi.fn();
const signUpMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signUp: signUpMock },
  }),
}));

import { SignupForm } from '@/components/auth/signup-form';
import { LanguageProvider } from '@/lib/i18n/language-provider';
import { translations } from '@/lib/i18n/translations';

function renderForm(onSuccess = vi.fn()) {
  render(
    <LanguageProvider initialLocale="en">
      <SignupForm onSuccess={onSuccess} />
    </LanguageProvider>,
  );
  return onSuccess;
}

function completeForm() {
  fireEvent.change(screen.getByLabelText(translations.en.auth.fullNameLabel), { target: { value: 'Lee Dubrovsky' } });
  fireEvent.change(screen.getByLabelText(translations.en.auth.emailLabel), { target: { value: 'lee@example.com' } });
  fireEvent.change(screen.getByLabelText(translations.en.auth.passwordLabel), { target: { value: 'password123' } });
  fireEvent.change(screen.getByLabelText(translations.en.auth.confirmPasswordLabel), {
    target: { value: 'password123' },
  });
}

describe('signup form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an unsigned business registration to the public page instead of protected onboarding', async () => {
    signUpMock.mockResolvedValue({ data: { user: { identities: [{ id: 'identity-1' }] }, session: null }, error: null });
    const onSuccess = renderForm();

    completeForm();
    fireEvent.click(screen.getByLabelText(translations.en.auth.accountTypeBusiness));
    fireEvent.click(screen.getByRole('button', { name: translations.en.auth.signupSubmit }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(false));
    expect(pushMock).toHaveBeenCalledWith('/');
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it('continues a signed-in business registration to onboarding', async () => {
    signUpMock.mockResolvedValue({
      data: { user: { identities: [{ id: 'identity-1' }] }, session: { access_token: 'session-token' } },
      error: null,
    });
    const onSuccess = renderForm();

    completeForm();
    fireEvent.click(screen.getByLabelText(translations.en.auth.accountTypeBusiness));
    fireEvent.click(screen.getByRole('button', { name: translations.en.auth.signupSubmit }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(true));
    expect(pushMock).toHaveBeenCalledWith('/onboarding');
  });
});
