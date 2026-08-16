'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useLanguage } from '@/lib/i18n/language-provider';
import { createClient } from '@/lib/supabase/client';
import { completeProfileInput, type CompleteProfileInput } from '@/lib/validation/identity';

/**
 * First-sign-in completion step for Google OAuth (TECHNICAL_DESIGN.md §12.34/§12.35) — Google
 * can't carry the CLIENT/BUSINESS choice, and this doubles as the one place a Google user
 * confirms/edits the display name the trigger pulled from their Google account.
 */
export function ChooseRoleForm({ initialFullName }: { initialFullName: string }) {
  const { copy } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState<'client' | 'business' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteProfileInput>({
    resolver: zodResolver(completeProfileInput),
    defaultValues: { fullName: initialFullName, accountType: 'CLIENT' },
  });

  async function saveFullName(fullName: string) {
    if (fullName === initialFullName) return null;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user!.id);
    return updateError;
  }

  async function continueAsClient(values: CompleteProfileInput) {
    setLoading('client');
    setError(null);
    const updateError = await saveFullName(values.fullName);
    if (updateError) {
      setError(updateError.message);
      setLoading(null);
      return;
    }
    router.push('/');
    router.refresh();
  }

  async function continueAsBusiness(values: CompleteProfileInput) {
    setLoading('business');
    setError(null);
    const updateError = await saveFullName(values.fullName);
    if (updateError) {
      setError(updateError.message);
      setLoading(null);
      return;
    }
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc('claim_business_account_type');
    if (rpcError) {
      setError(rpcError.message);
      setLoading(null);
      return;
    }
    router.push('/onboarding');
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-6" noValidate>
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">{copy.auth.chooseRoleTitle}</h1>
        <p className="text-sm text-[var(--muted)]">{copy.auth.chooseRoleSubtitle}</p>
      </div>

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

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleSubmit(continueAsClient)}
          disabled={loading !== null}
          className="rounded-full border border-[var(--line)] px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--soft-violet)] disabled:opacity-60"
        >
          {copy.auth.continueAsClient}
        </button>
        <button
          type="button"
          onClick={handleSubmit(continueAsBusiness)}
          disabled={loading !== null}
          className="rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-deep)] disabled:opacity-60"
        >
          {copy.auth.continueAsBusiness}
        </button>
      </div>
    </form>
  );
}
