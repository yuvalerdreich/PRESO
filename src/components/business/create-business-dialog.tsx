'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, CheckCircle2, Plus, Scissors, UserPlus, X } from 'lucide-react';

import { useLanguage } from '@/lib/i18n/language-provider';
import { createBusiness } from '@/server/actions/business';
import type { BusinessCategory } from '@/types/domain';

type ServiceDraft = { id: number; name: string; price: string; duration: string };

const fieldClassName =
  'mt-2 w-full rounded-2xl border border-[var(--line)] bg-slate-50 px-4 py-3 text-sm text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/15';

/**
 * The real "open a business" wizard — it calls `createBusiness` (`server/actions/business.ts`),
 * which runs `create_business_with_owner()` and then inserts the opening service list against the
 * `employees` row that RPC created.
 *
 * Two steps of the original mock form had nowhere to write to, and both were replaced rather than
 * left collecting text the database would discard:
 *
 * - **Staff.** There is no way to create colleagues here: §6.8 rule 5 says an `employees` row only
 *   exists once the founder approves a `join_request`, so staff arrive by requesting to join. The
 *   step now collects the founder's *own* position title (the one `employees` row this does
 *   create) and says where the rest come from.
 * - **Policies.** `cancellationPolicy`/`appointmentPolicy`/`paymentNotes` were free text with no
 *   columns behind them. §12.2 settled on a typed `cancellation_window_hours` (0–168) and
 *   explicitly rejected a richer tiered policy, so the step now edits that number plus
 *   `approval_policy` — the two fields that actually change how booking behaves.
 */
export function CreateBusinessDialog({
  categories,
  onClose,
  onCreated,
}: {
  categories: BusinessCategory[];
  onClose: () => void;
  /** Fired after a successful create so the parent can `router.refresh()` its own list. */
  onCreated?: () => void;
}) {
  const { copy } = useLanguage();
  const router = useRouter();
  const [services, setServices] = useState<ServiceDraft[]>([{ id: 1, name: '', price: '', duration: '45' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [createdName, setCreatedName] = useState<string | null>(null);

  function updateService(id: number, field: keyof Omit<ServiceDraft, 'id'>, value: string) {
    setServices((current) => current.map((service) => (service.id === id ? { ...service, [field]: value } : service)));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '');

    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const result = await createBusiness({
        name,
        categoryId: String(form.get('categoryId') ?? ''),
        area: String(form.get('area') ?? ''),
        address: String(form.get('address') ?? ''),
        phone: String(form.get('phone') ?? ''),
        description: String(form.get('description') ?? ''),
        positionTitle: String(form.get('positionTitle') ?? ''),
        approvalPolicy: String(form.get('approvalPolicy') ?? 'AUTO') as 'AUTO' | 'MANUAL',
        cancellationWindowHours: String(form.get('cancellationWindowHours') ?? '24'),
        // A blank row is dropped rather than rejected — the form opens with one empty service and
        // "no services yet" is a legal outcome (see `createBusinessInput`).
        services: services
          .filter((service) => service.name.trim().length > 0)
          .map((service) => ({
            name: service.name,
            price: service.price,
            durationMinutes: service.duration,
            bufferMinutes: 0,
            status: 'ACTIVE' as const,
          })),
      });

      if (!result.ok) {
        setFormError(result.error.message);
        setFieldErrors(result.error.fields ?? {});
        return;
      }

      setCreatedName(name);
      router.refresh();
      onCreated?.();
    } finally {
      setIsSubmitting(false);
    }
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

        {createdName ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-xl font-extrabold text-[var(--foreground)]">{copy.createBusiness.submittedTitle}</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
              {copy.createBusiness.submittedDescription}
            </p>
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
                <Field label={copy.createBusiness.businessName} required error={fieldErrors.name}>
                  <input required name="name" className={fieldClassName} placeholder="Studio Zohar" />
                </Field>
                <Field label={copy.createBusiness.category} required error={fieldErrors.categoryId}>
                  <select required name="categoryId" defaultValue="" className={fieldClassName}>
                    <option value="" disabled>
                      {copy.createBusiness.chooseCategory}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={copy.createBusiness.city} required error={fieldErrors.area}>
                  <input required name="area" className={fieldClassName} placeholder="תל אביב" />
                </Field>
                <Field label={copy.createBusiness.address} required error={fieldErrors.address}>
                  <input required name="address" className={fieldClassName} placeholder="דיזנגוף 142" />
                </Field>
                <Field label={copy.createBusiness.phone} required error={fieldErrors.phone}>
                  <input required name="phone" type="tel" className={fieldClassName} placeholder="054-1112233" />
                </Field>
              </div>
              <Field label={copy.createBusiness.businessDescription} error={fieldErrors.description}>
                <textarea
                  name="description"
                  className={`${fieldClassName} min-h-24 resize-y`}
                  placeholder="ספר/י בכמה מילים על העסק, המומחיות והאווירה במקום..."
                />
              </Field>
            </FormSection>

            <FormSection
              title={copy.createBusiness.servicesStep}
              icon={Scissors}
              action={
                <button
                  type="button"
                  onClick={() =>
                    setServices((current) => [
                      ...current,
                      { id: Math.max(0, ...current.map((s) => s.id)) + 1, name: '', price: '', duration: '45' },
                    ])
                  }
                  className="flex items-center gap-2 text-sm font-bold text-[var(--brand)] hover:text-[var(--brand-deep)]"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {copy.createBusiness.addService}
                </button>
              }
            >
              <div className="flex flex-col gap-4">
                {services.map((service, index) => (
                  <div key={service.id} className="rounded-3xl border border-[var(--line)] bg-slate-50/80 p-4">
                    <p className="mb-3 text-sm font-bold text-[var(--foreground)]">
                      {copy.createBusiness.serviceName} #{index + 1}
                    </p>
                    <div className="grid gap-3 md:grid-cols-[1fr_10rem_10rem]">
                      <input
                        value={service.name}
                        onChange={(event) => updateService(service.id, 'name', event.target.value)}
                        className={fieldClassName}
                        placeholder={copy.createBusiness.serviceName}
                      />
                      <input
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
              {fieldErrors.services ? (
                <p className="mt-3 text-sm font-medium text-rose-600">{fieldErrors.services}</p>
              ) : null}
            </FormSection>

            <FormSection title={copy.createBusiness.staffStep} icon={UserPlus}>
              <p className="text-sm text-[var(--muted)]">{copy.createBusiness.staffDescription}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Field label={copy.createBusiness.position} required error={fieldErrors.positionTitle}>
                  <input required name="positionTitle" className={fieldClassName} defaultValue="בעל/ת העסק" />
                </Field>
              </div>
            </FormSection>

            <FormSection title={copy.createBusiness.policiesStep} icon={Building2}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label={copy.createBusiness.cancellationWindow}
                  error={fieldErrors.cancellationWindowHours}
                  hint={copy.createBusiness.cancellationWindowHint}
                >
                  <input
                    type="number"
                    name="cancellationWindowHours"
                    min="0"
                    max="168"
                    defaultValue="24"
                    className={fieldClassName}
                  />
                </Field>
                <Field label={copy.createBusiness.approvalPolicy} error={fieldErrors.approvalPolicy}>
                  <select name="approvalPolicy" className={fieldClassName} defaultValue="AUTO">
                    <option value="AUTO">{copy.createBusiness.autoApproval}</option>
                    <option value="MANUAL">{copy.createBusiness.manualApproval}</option>
                  </select>
                </Field>
              </div>
            </FormSection>

            {formError ? (
              <p role="alert" className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {formError}
              </p>
            ) : null}

            <div className="mt-7 flex flex-wrap gap-3 border-t border-[var(--line)] pt-5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-2xl bg-[var(--brand)] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[var(--brand)]/25 hover:bg-[var(--brand-deep)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Building2 className="h-4 w-4" aria-hidden="true" />
                {isSubmitting ? copy.createBusiness.submitting : copy.createBusiness.submit}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-[var(--foreground)] hover:bg-slate-200"
              >
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

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-bold text-[var(--foreground)]">
      {label}
      {required ? <span className="ms-1 text-rose-500">*</span> : null}
      {children}
      {hint && !error ? <span className="mt-1 block text-xs font-medium text-[var(--muted)]">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span> : null}
    </label>
  );
}
