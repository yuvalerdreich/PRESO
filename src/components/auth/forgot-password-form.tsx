'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useLanguage } from '@/lib/i18n/language-provider';
import { createClient } from '@/lib/supabase/client';
import { forgotPasswordInput, type ForgotPasswordInput } from '@/lib/validation/identity';

export function ForgotPasswordForm() {
  const { copy } = useLanguage();
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordInput) });

  async function onSubmit(values: ForgotPasswordInput) {
    const supabase = createClient();
    // Deliberately ignore the response — always show the same "check your email" state so
    // this endpoint can't be used to enumerate which addresses have accounts.
    await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    });
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-xl font-bold text-[var(--foreground)]">{copy.auth.checkYourEmailTitle}</h1>
        <p className="text-sm text-[var(--muted)]">{copy.auth.checkYourEmailBody}</p>
        <Link href="/login" className="text-sm font-medium text-[var(--brand)] hover:underline">
          {copy.auth.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">{copy.auth.forgotTitle}</h1>
        <p className="text-sm text-[var(--muted)]">{copy.auth.forgotSubtitle}</p>
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-deep)] disabled:opacity-60"
        >
          {copy.auth.forgotSubmit}
        </button>
      </form>

      <Link href="/login" className="text-center text-sm font-medium text-[var(--brand)] hover:underline">
        {copy.auth.backToLogin}
      </Link>
    </div>
  );
}
