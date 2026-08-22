'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { GoogleButton } from '@/components/auth/google-button';
import { useLanguage } from '@/lib/i18n/language-provider';
import { createClient } from '@/lib/supabase/client';
import { signupInput, type SignupInput } from '@/lib/validation/identity';

export function SignupForm({ next }: { next?: string }) {
  const { copy } = useLanguage();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupInput),
    defaultValues: { accountType: 'CLIENT' },
  });

  async function onSubmit(values: SignupInput) {
    setServerError(null);
    const supabase = createClient();

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName,
          phone: values.phone || null,
          account_type: values.accountType,
        },
      },
    });

    if (signUpError) {
      setServerError(signUpError.message);
      return;
    }

    // Supabase's enumeration guard: signing up with an email that already has an
    // unconfirmed auth.users row returns a fake success (no error) with an empty
    // `identities` array, and never touches the DB — no auth.users row is written,
    // so `handle_new_user()` never fires and `profiles` silently gets nothing.
    if (signUpData.user && signUpData.user.identities?.length === 0) {
      setServerError(copy.auth.emailAlreadyRegistered);
      return;
    }

    if (values.accountType === 'BUSINESS') {
      router.push('/onboarding');
    } else {
      router.push(next ?? '/');
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">{copy.auth.signupTitle}</h1>
        <p className="text-sm text-[var(--muted)]">{copy.auth.signupSubtitle}</p>
      </div>

      <GoogleButton next="/signup/choose-role" />

      <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
        <span className="h-px flex-1 bg-[var(--line)]" />
        {copy.auth.orDivider}
        <span className="h-px flex-1 bg-[var(--line)]" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
          {copy.auth.fullNameLabel}
          <input
            type="text"
            autoComplete="name"
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            {...register('fullName')}
          />
          {errors.fullName ? <span className="text-xs text-red-600">{errors.fullName.message}</span> : null}
        </label>

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
          {copy.auth.phoneLabel}
          <input
            type="tel"
            autoComplete="tel"
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            {...register('phone')}
          />
          {errors.phone ? <span className="text-xs text-red-600">{errors.phone.message}</span> : null}
        </label>

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

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-[var(--foreground)]">{copy.auth.accountTypeLabel}</legend>
          <label className="flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-sm has-[:checked]:border-[var(--brand)] has-[:checked]:bg-[var(--soft-violet)]">
            <input type="radio" value="CLIENT" {...register('accountType')} />
            {copy.auth.accountTypeClient}
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2 text-sm has-[:checked]:border-[var(--brand)] has-[:checked]:bg-[var(--soft-violet)]">
            <input type="radio" value="BUSINESS" {...register('accountType')} />
            {copy.auth.accountTypeBusiness}
          </label>
          {errors.accountType ? <span className="text-xs text-red-600">{errors.accountType.message}</span> : null}
        </fieldset>

        {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-deep)] disabled:opacity-60"
        >
          {copy.auth.signupSubmit}
        </button>
      </form>

      <p className="text-center text-sm text-[var(--muted)]">
        {copy.auth.haveAccount}{' '}
        <Link href="/login" className="font-medium text-[var(--brand)] hover:underline">
          {copy.auth.loginLink}
        </Link>
      </p>
    </div>
  );
}
