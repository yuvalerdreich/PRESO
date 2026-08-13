'use client';

import { CheckCircle2, Send } from 'lucide-react';
import { FormEvent, useState } from 'react';

import { EntryFormShell } from '@/components/business/entry-form-shell';
import { JoinableBusinessList } from '@/components/business/joinable-business-list';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { JoinableBusiness } from '@/types/business-entry';

export function JoinBusinessForm({ businesses }: { businesses: JoinableBusiness[] }) {
  const { locale, copy } = useLanguage();
  const entry = copy.businessEntry;
  const [businessId, setBusinessId] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const selectedBusiness = businesses.find((business) => business.id === businessId);
  const fieldClass = 'mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[#faf9ff] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-100';
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowErrors(true);
    if (!businessId || !position.trim() || !phone.trim()) return;
    setSubmitted(true);
  };

  return (
    <EntryFormShell icon={Send} title={entry.joinPageTitle} description={entry.joinPageDescription}>
      {submitted && selectedBusiness ? (
        <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-5 text-amber-950">
          <CheckCircle2 aria-hidden="true" size={25} className="text-amber-600" />
          <h2 className="mt-3 text-lg font-black">{entry.joinSuccessTitle}</h2>
          <p className="mt-2 text-sm font-bold text-amber-800">{selectedBusiness.name[locale]}</p>
          <p className="mt-2 text-sm leading-6 text-amber-900">{entry.joinSuccessDescription}</p>
          <button type="button" onClick={() => { setSubmitted(false); setBusinessId(''); setPosition(''); setPhone(''); setShowErrors(false); }} className="mt-5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-amber-800 shadow-sm transition hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-amber-600">{entry.chooseAnother}</button>
        </div>
      ) : (
        <form className="mt-6 grid gap-5" onSubmit={submit} noValidate>
          <fieldset>
            <legend className="text-sm font-bold">{entry.chooseBusiness}</legend>
            <div className="mt-3"><JoinableBusinessList businesses={businesses} selectedId={businessId} onSelect={setBusinessId} /></div>
            {showErrors && !businessId && <p className="mt-2 text-xs font-semibold text-rose-600">{entry.chooseBusinessError}</p>}
          </fieldset>
          {selectedBusiness && <div className="rounded-xl bg-violet-50 px-4 py-3 text-sm font-semibold text-[var(--brand)]"><span className="text-[#536383]">{entry.selectedBusiness}: </span>{selectedBusiness.name[locale]}</div>}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-bold">{entry.positionTitle}<input value={position} onChange={(event) => setPosition(event.target.value)} className={fieldClass} />{showErrors && !position.trim() && <span className="mt-1.5 block text-xs font-semibold text-rose-600">{entry.requiredField}</span>}</label>
            <label className="text-sm font-bold">{entry.contactPhone}<input inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className={fieldClass} />{showErrors && !phone.trim() && <span className="mt-1.5 block text-xs font-semibold text-rose-600">{entry.requiredField}</span>}</label>
          </div>
          <p className="rounded-xl bg-[#faf9ff] px-4 py-3 text-xs font-semibold leading-5 text-[var(--muted)]">{entry.demoNotice}</p>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(82,56,247,.22)] transition hover:bg-[var(--brand-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"><Send aria-hidden="true" size={17} />{entry.joinSubmit}</button>
        </form>
      )}
    </EntryFormShell>
  );
}
