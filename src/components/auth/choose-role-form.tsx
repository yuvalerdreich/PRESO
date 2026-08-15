'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useLanguage } from '@/lib/i18n/language-provider';
import { createClient } from '@/lib/supabase/client';

/** Post-OAuth account-type picker (TECHNICAL_DESIGN.md §12.34) — see claim_business_account_type(). */
export function ChooseRoleForm() {
  const { copy } = useLanguage();
  const router = useRouter();
  const [loading, setLoading] = useState<'client' | 'business' | null>(null);
  const [error, setError] = useState<string | null>(null);

  function continueAsClient() {
    router.push('/');
    router.refresh();
  }

  async function continueAsBusiness() {
    setLoading('business');
    setError(null);
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--foreground)]">{copy.auth.chooseRoleTitle}</h1>
        <p className="text-sm text-[var(--muted)]">{copy.auth.chooseRoleSubtitle}</p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={continueAsClient}
          disabled={loading !== null}
          className="rounded-full border border-[var(--line)] px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--soft-violet)] disabled:opacity-60"
        >
          {copy.auth.continueAsClient}
        </button>
        <button
          type="button"
          onClick={continueAsBusiness}
          disabled={loading !== null}
          className="rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--brand-deep)] disabled:opacity-60"
        >
          {copy.auth.continueAsBusiness}
        </button>
      </div>
    </div>
  );
}
