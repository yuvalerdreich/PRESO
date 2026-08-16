'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useLanguage } from '@/lib/i18n/language-provider';
import { createClient } from '@/lib/supabase/client';
import { resetPasswordInput, type ResetPasswordInput } from '@/lib/validation/identity';

export function ResetPasswordForm({ hasSession }: { hasSession: boolean }) {
  const { copy } = useLanguage();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordInput) });

  async function onSubmit(values: ResetPasswordInput) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) {
      setServerError(error.message);
      return;
    }
    router.push('/login');
  }

  if (!hasSession) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <h1 className="text-xl font-bold text-[var(--foreground)]">{copy.auth.resetTitle}</h1>
        <p className="text-sm text-red-600">{copy.auth.noRecoverySession}</p>
        <Link href="/forgot-password" className="text-sm font-medium text-[var(--brand)] hover:underline">
          {copy.auth.requestNewLink}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">{copy.auth.resetTitle}</h1>
        <p className="text-sm text-[var(--muted)]">{copy.auth.resetSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
          {copy.auth.passwordLabel}
          <input
            type="password"
            autoComplete="new-password"
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            {...register('password')}
          />
          {errors.password ? <span className="text-xs text-red-600">{errors.password.message}</span> : null}
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
          {copy.auth.confirmPasswordLabel}
          <input
            type="password"
            autoComplete="new-password"
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword ? (
            <span className="text-xs text-red-600">{errors.confirmPassword.message}</span>
          ) : null}
        </label>

        {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-deep)] disabled:opacity-60"
        >
          {copy.auth.resetSubmit}
        </button>
      </form>
    </div>
  );
}
