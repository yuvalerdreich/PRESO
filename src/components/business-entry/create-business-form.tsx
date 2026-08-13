'use client';

import { CheckCircle2, Store } from 'lucide-react';
import { FormEvent, useState } from 'react';

import { useLanguage } from '@/lib/i18n/language-provider';
import type { BusinessEntryArea, BusinessEntryCategory } from '@/types/business-entry';

type CreateBusinessFormProps = {
  areas: BusinessEntryArea[];
  categories: BusinessEntryCategory[];
  onComplete: () => void;
};

type CreateFields = {
  name: string;
  category: string;
  area: string;
  address: string;
  phone: string;
  description: string;
};

const initialFields: CreateFields = { name: '', category: '', area: '', address: '', phone: '', description: '' };

export function CreateBusinessForm({ areas, categories, onComplete }: CreateBusinessFormProps) {
  const { locale, copy } = useLanguage();
  const [fields, setFields] = useState(initialFields);
  const [submitted, setSubmitted] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const entry = copy.businessEntry;
  const requiredKeys = ['name', 'category', 'area', 'address', 'phone'] as const;
  const hasErrors = requiredKeys.some((key) => !fields[key].trim());
  const fieldClass = 'mt-1.5 w-full rounded-xl border border-[var(--line)] bg-[#faf9ff] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[#9aa4ba] focus:border-violet-300 focus:ring-2 focus:ring-violet-100';

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowErrors(true);
    if (hasErrors) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-900">
        <CheckCircle2 aria-hidden="true" size={25} className="text-emerald-600" />
        <h2 className="mt-3 text-lg font-black">{entry.createSuccessTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-emerald-800">{entry.createSuccessDescription}</p>
        <button type="button" onClick={onComplete} className="mt-5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 shadow-sm transition hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-emerald-600">{entry.close}</button>
      </div>
    );
  }

  const requiredError = (value: string) => showErrors && !value.trim() ? <p className="mt-1.5 text-xs font-semibold text-rose-600">{entry.requiredField}</p> : null;

  return (
    <form className="mt-6 grid gap-4" onSubmit={submit} noValidate>
      <label htmlFor="create-business-name" className="text-sm font-bold">{entry.businessName}</label><input id="create-business-name" value={fields.name} onChange={(event) => setFields({ ...fields, name: event.target.value })} className={fieldClass} />
      {requiredError(fields.name)}
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="create-business-category" className="text-sm font-bold">{entry.category}</label><select id="create-business-category" value={fields.category} onChange={(event) => setFields({ ...fields, category: event.target.value })} className={fieldClass}><option value="">{entry.selectCategory}</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name[locale]}</option>)}</select>{requiredError(fields.category)}</div>
        <div><label htmlFor="create-business-area" className="text-sm font-bold">{entry.area}</label><select id="create-business-area" value={fields.area} onChange={(event) => setFields({ ...fields, area: event.target.value })} className={fieldClass}><option value="">{entry.selectArea}</option>{areas.map((area) => <option key={area.id} value={area.id}>{area.name[locale]}</option>)}</select>{requiredError(fields.area)}</div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="create-business-address" className="text-sm font-bold">{entry.address}</label><input id="create-business-address" value={fields.address} onChange={(event) => setFields({ ...fields, address: event.target.value })} className={fieldClass} />{requiredError(fields.address)}</div>
        <div><label htmlFor="create-business-phone" className="text-sm font-bold">{entry.phone}</label><input id="create-business-phone" inputMode="tel" value={fields.phone} onChange={(event) => setFields({ ...fields, phone: event.target.value })} className={fieldClass} />{requiredError(fields.phone)}</div>
      </div>
      <div><label htmlFor="create-business-description" className="text-sm font-bold">{entry.shortDescription}</label><textarea id="create-business-description" value={fields.description} onChange={(event) => setFields({ ...fields, description: event.target.value })} className={`${fieldClass} min-h-24 resize-y`} /></div>
      <button type="submit" className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(82,56,247,.22)] transition hover:bg-[var(--brand-deep)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"><Store aria-hidden="true" size={17} />{entry.createSubmit}</button>
    </form>
  );
}
