'use client';

import { useState } from 'react';
import { Building2, Plus, Scissors, UserPlus, X } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';

type ServiceDraft = { id: number; name: string; price: string; duration: string };

const fieldClassName =
  'mt-2 w-full rounded-2xl border border-[var(--line)] bg-slate-50 px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15';

export function CreateBusinessDialog({ onClose }: { onClose: () => void }) {
  const { copy } = useLanguage();
  const [services, setServices] = useState<ServiceDraft[]>([{ id: 1, name: '', price: '', duration: '45' }]);
  const [staffCount, setStaffCount] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  function updateService(id: number, field: keyof Omit<ServiceDraft, 'id'>, value: string) {
    setServices((current) => current.map((service) => (service.id === id ? { ...service, [field]: value } : service)));
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.createBusiness.title}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-5 sm:px-8">
          <div className="flex items-center gap-4 text-right">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand)] text-white shadow-lg shadow-[var(--brand)]/30">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-[var(--foreground)]">{copy.createBusiness.title}</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">{copy.createBusiness.description}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.createBusiness.close}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--soft-violet)] hover:text-[var(--foreground)]"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </header>

        {submitted ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Building2 className="h-8 w-8" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-xl font-extrabold text-[var(--foreground)]">{copy.createBusiness.submittedTitle}</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">{copy.createBusiness.submittedDescription}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-7 rounded-2xl bg-[var(--brand)] px-5 py-3 text-sm font-bold text-white hover:bg-[var(--brand-deep)]"
            >
              {copy.createBusiness.close}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
            <FormSection title={copy.createBusiness.detailsStep} icon={Building2}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label={copy.createBusiness.businessName} required>
                  <input required className={fieldClassName} placeholder="Studio Zohar" />
                </Field>
                <Field label={copy.createBusiness.category} required>
                  <select required defaultValue="" className={fieldClassName}>
                    <option value="" disabled>{copy.createBusiness.chooseCategory}</option>
                    <option value="hair-beauty">{copy.createBusiness.hairAndBeauty}</option>
                    <option value="wellness">{copy.createBusiness.wellness}</option>
                  </select>
                </Field>
                <Field label={copy.createBusiness.city} required>
                  <input required className={fieldClassName} placeholder="תל אביב" />
                </Field>
                <Field label={copy.createBusiness.address} required>
                  <input required className={fieldClassName} placeholder="דיזנגוף 142" />
                </Field>
                <Field label={copy.createBusiness.phone} required>
                  <input required type="tel" className={fieldClassName} placeholder="054-1112233" />
                </Field>
              </div>
              <Field label={copy.createBusiness.businessDescription}>
                <textarea className={`${fieldClassName} min-h-24 resize-y`} placeholder="ספר/י בכמה מילים על העסק, המומחיות והאווירה במקום..." />
              </Field>
            </FormSection>

            <FormSection title={copy.createBusiness.servicesStep} icon={Scissors} action={
              <button
                type="button"
                onClick={() => setServices((current) => [...current, { id: current.length + 1, name: '', price: '', duration: '45' }])}
                className="flex items-center gap-2 text-sm font-bold text-[var(--brand)] hover:text-[var(--brand-deep)]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {copy.createBusiness.addService}
              </button>
            }>
              <div className="flex flex-col gap-4">
                {services.map((service, index) => (
                  <div key={service.id} className="rounded-3xl border border-[var(--line)] bg-slate-50/80 p-4">
                    <p className="mb-3 text-sm font-bold text-[var(--foreground)]">{copy.createBusiness.serviceName} #{index + 1}</p>
                    <div className="grid gap-3 md:grid-cols-[1fr_10rem_10rem]">
                      <input
                        required
                        value={service.name}
                        onChange={(event) => updateService(service.id, 'name', event.target.value)}
                        className={fieldClassName}
                        placeholder={copy.createBusiness.serviceName}
                      />
                      <input
                        required
                        min="0"
                        type="number"
                        value={service.price}
                        onChange={(event) => updateService(service.id, 'price', event.target.value)}
                        className={fieldClassName}
                        placeholder={copy.createBusiness.price}
                      />
                      <select
                        value={service.duration}
                        onChange={(event) => updateService(service.id, 'duration', event.target.value)}
                        className={fieldClassName}
                      >
                        <option value="30">30 {copy.createBusiness.minutes}</option>
                        <option value="45">45 {copy.createBusiness.minutes}</option>
                        <option value="60">60 {copy.createBusiness.minutes}</option>
                        <option value="90">90 {copy.createBusiness.minutes}</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </FormSection>

            <FormSection title={copy.createBusiness.staffStep} icon={UserPlus} action={
              <button
                type="button"
                onClick={() => setStaffCount((count) => count + 1)}
                className="flex items-center gap-2 text-sm font-bold text-[var(--brand)] hover:text-[var(--brand-deep)]"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {copy.createBusiness.addStaff}
              </button>
            }>
              <p className="text-sm text-[var(--muted)]">{copy.createBusiness.staffDescription}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {Array.from({ length: staffCount }, (_, index) => (
                  <Field key={index} label={`${copy.createBusiness.position} #${index + 1}`} required>
                    <input required className={fieldClassName} defaultValue={index === 0 ? 'בעל/ת העסק' : ''} />
                  </Field>
                ))}
              </div>
            </FormSection>

            <FormSection title={copy.createBusiness.policiesStep} icon={Building2}>
              <div className="grid gap-4">
                <Field label={copy.createBusiness.cancellationPolicy}>
                  <textarea className={`${fieldClassName} min-h-20 resize-y`} defaultValue="ניתן לבטל תור עד 4 שעות מראש ללא דמי ביטול." />
                </Field>
                <Field label={copy.createBusiness.appointmentPolicy}>
                  <textarea className={`${fieldClassName} min-h-20 resize-y`} defaultValue="קביעת תורים מתאפשרת עד 30 יום מראש." />
                </Field>
                <Field label={copy.createBusiness.paymentNotes}>
                  <textarea className={`${fieldClassName} min-h-20 resize-y`} defaultValue="תשלום במזומן, באפליקציות תשלום או באשראי בעת ההגעה לבית העסק." />
                </Field>
                <Field label={copy.createBusiness.approvalPolicy}>
                  <select className={fieldClassName} defaultValue="auto">
                    <option value="auto">{copy.createBusiness.autoApproval}</option>
                    <option value="manual">{copy.createBusiness.manualApproval}</option>
                  </select>
                </Field>
              </div>
            </FormSection>

            <div className="mt-7 flex flex-wrap gap-3 border-t border-[var(--line)] pt-5">
              <button type="submit" className="flex items-center gap-2 rounded-2xl bg-[var(--brand)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--brand)]/25 hover:bg-[var(--brand-deep)]">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                {copy.createBusiness.submit}
              </button>
              <button type="button" onClick={onClose} className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-[var(--foreground)] hover:bg-slate-200">
                {copy.createBusiness.cancel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function FormSection({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: typeof Building2;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-[var(--line)] py-6 first:pt-0 last:border-b-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-[var(--brand)]">
          <Icon className="h-5 w-5" aria-hidden="true" />
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-bold text-[var(--foreground)]">
      {label}{required ? <span className="ms-1 text-rose-500">*</span> : null}
      {children}
    </label>
  );
}
