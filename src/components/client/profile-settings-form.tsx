'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

import { Modal } from '@/components/common/modal';
import { useLanguage } from '@/lib/i18n/language-provider';
import { createClient } from '@/lib/supabase/client';
import { profileSettingsInput, type ProfileSettingsInput } from '@/lib/validation/identity';
import type { Database } from '@/types/database.types';

type AccountType = Database['public']['Enums']['account_type'];

export function ProfileSettingsForm({
  initialLocation,
  initialDateOfBirth,
  accountType,
}: {
  initialLocation: string;
  initialDateOfBirth: string;
  accountType: AccountType;
}) {
  const { copy } = useLanguage();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileSettingsInput>({
    resolver: zodResolver(profileSettingsInput),
    defaultValues: { location: initialLocation, dateOfBirth: initialDateOfBirth },
  });

  async function onSubmit(values: ProfileSettingsInput) {
    setServerError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('profiles')
      .update({
        location: values.location || null,
        date_of_birth: values.dateOfBirth || null,
      })
      .eq('id', user!.id);

    if (error) {
      setServerError(error.message);
      return;
    }

    toast.success(copy.profileSettings.savedToast);
    router.refresh();
  }

  async function confirmSwitchToBusiness() {
    setSwitching(true);
    setSwitchError(null);
    const supabase = createClient();
    const { error } = await supabase.rpc('claim_business_account_type');
    if (error) {
      setSwitchError(error.message);
      setSwitching(false);
      setConfirmOpen(false);
      return;
    }
    router.push('/onboarding');
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">{copy.profileSettings.title}</h1>
        <p className="text-sm text-[var(--muted)]">{copy.profileSettings.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
            {copy.profileSettings.locationLabel}
            <input
              type="text"
              autoComplete="address-level2"
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              {...register('location')}
            />
            {errors.location ? <span className="text-xs text-red-600">{errors.location.message}</span> : null}
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-[var(--foreground)]">
            {copy.profileSettings.dateOfBirthLabel}
            <input
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              className="rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
              {...register('dateOfBirth')}
            />
            {errors.dateOfBirth ? (
              <span className="text-xs text-red-600">{errors.dateOfBirth.message}</span>
            ) : null}
          </label>

          {serverError ? <p className="text-sm text-red-600">{serverError}</p> : null}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--line)] p-4">
          <h2 className="text-sm font-bold text-[var(--foreground)]">{copy.profileSettings.accountTypeTitle}</h2>

          {accountType === 'CLIENT' ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-[var(--muted)]">{copy.profileSettings.accountTypeClientBody}</p>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  disabled={switching}
                  className="shrink-0 rounded-full border border-[var(--line)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--soft-violet)] disabled:opacity-60"
                >
                  {copy.profileSettings.switchToBusiness}
                </button>
              </div>
              {switchError ? <p className="text-sm text-red-600">{switchError}</p> : null}
            </>
          ) : (
            <p className="text-sm text-[var(--muted)]">{copy.profileSettings.accountTypeBusinessBody}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="self-start rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-deep)] disabled:opacity-60"
        >
          {copy.profileSettings.saveButton}
        </button>
      </form>

      {confirmOpen ? (
        <Modal
          onClose={() => setConfirmOpen(false)}
          closeLabel={copy.profileSettings.close}
          ariaLabel={copy.profileSettings.confirmSwitchTitle}
        >
          <div>
            <h2 className="text-lg font-bold text-[var(--foreground)]">{copy.profileSettings.confirmSwitchTitle}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{copy.profileSettings.switchToBusinessNote}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              disabled={switching}
              className="flex-1 rounded-full border border-[var(--line)] px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--soft-violet)] disabled:opacity-60"
            >
              {copy.profileSettings.cancelButton}
            </button>
            <button
              type="button"
              onClick={confirmSwitchToBusiness}
              disabled={switching}
              className="flex-1 rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-deep)] disabled:opacity-60"
            >
              {copy.profileSettings.confirmSwitchButton}
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
