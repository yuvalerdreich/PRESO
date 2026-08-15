'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { GoogleButton } from '@/components/auth/google-button';
import { getDefaultDestination } from '@/lib/auth/default-destination';
import { useLanguage } from '@/lib/i18n/language-provider';
import { createClient } from '@/lib/supabase/client';
import { loginInput, type LoginInput } from '@/lib/validation/identity';

export function LoginForm({ next }: { next?: string }) {
  const { copy } = useLanguage();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginInput) });

  async function onSubmit(values: LoginInput) {
    setServerError(null);
    const supabase = createClient();

    const { error: signInError } = await supabase.auth.signInWithPassword(values);
    if (signInError) {
      setServerError(copy.auth.invalidCredentials);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setServerError(copy.auth.invalidCredentials);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('account_type, status')
      .eq('id', user.id)
      .single();

    if (!profile) {
      setServerError(copy.auth.invalidCredentials);
      return;
    }

    if (profile.status === 'SUSPENDED') {
      await supabase.auth.signOut();
      setServerError(copy.auth.suspendedAccount);
      return;
    }

    router.push(next ?? getDefaultDestination(profile.account_type));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">{copy.auth.loginTitle}</h1>
        <p className="text-sm text-[var(--muted)]">{copy.auth.loginSubtitle}</p>
      </div>

      <GoogleButton next={next} />

      <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
        <span className="h-px flex-1 bg-[var(--line)]" />
        {copy.auth.orDivider}
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
          {copy.auth.emailLabel}
          <input
            type="email"
            autoComplete="email"
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            {...register('email')}
          />
          {errors.email ? <span className="text-xs text-red-600">{errors.email.message}</span> : null}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
          {copy.auth.passwordLabel}
          <input
            type="password"
            autoComplete="current-password"
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            {...register('password')}
          />
          {errors.password ? <span className="text-xs text-red-600">{errors.password.message}</span> : null}
        </label>

        <Link href="/forgot-password" className="self-end text-xs font-medium text-[var(--brand)] hover:underline">
          {copy.auth.forgotPasswordLink}
        </Link>

        {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-deep)] disabled:opacity-60"
        >
          {copy.auth.loginSubmit}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--muted)]">
        {copy.auth.noAccountYet}{' '}
        <Link href="/signup" className="font-medium text-[var(--brand)] hover:underline">
          {copy.auth.signupLink}
        </Link>
      </p>
    </div>
  );
}
