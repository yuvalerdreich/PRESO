'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  CreditCard,
  Image as ImageIcon,
  type LucideIcon,
  MapPin,
  Save,
  Settings,
  ShieldCheck,
} from 'lucide-react';

import { DashboardSectionHeader } from '@/components/business/dashboard-section-header';
import { actionButton, actionButtonLarge } from '@/components/common/button-styles';
import { surfaceCard } from '@/components/common/card-styles';
import { fieldPadding, surfaceField } from '@/components/common/field-styles';
import { categoryPresentation } from '@/lib/i18n/categories';
import { useLanguage } from '@/lib/i18n/language-provider';
import { updateBusinessDetails } from '@/server/actions/business';
import type { BusinessCategory, DashboardBusiness } from '@/types/domain';

type ApprovalPolicy = 'AUTO' | 'MANUAL';

const fieldClassName = `${surfaceField} ${fieldPadding} mt-2`;

/**
 * `/businesses/manage/details` — everything about the business itself, on one screen.
 *
 * Five groups, in the order someone describes their own business: what it is, where it is, what it
 * looks like, how it takes bookings, and what it asks of clients. They are sections of one form
 * rather than tabs or separate screens, because all of it is a single `businesses` row — splitting
 * them would turn one save into five.
 *
 * Two fields are *typed* where the design mock had free text, and the difference is load-bearing:
 * `approval_policy` decides whether `book_appointment()` returns CONFIRMED or PENDING, and
 * `cancellation_window_hours` (§12.2) is what `cancel_appointment()` enforces. Prose in their place
 * would read the same and change nothing. The two genuinely free-text policies — booking/arrival
 * and payment — are exactly that, and each has a column of its own (§12.53, §12.44) rather than
 * being collected and dropped (§12.39).
 *
 * The photo is the one field whose effect is somewhere else entirely: it renders on the discovery
 * grid and the public booking page, never here, so the form previews what it is about to save.
 *
 * Any ACTIVE employee may save this, not only the founder (§12.1) — the same rule the action and
 * RLS enforce, so the screen offers no owner-only affordance it would have to take back.
 */
export function DashboardDetailsPage({
  business,
  categories,
}: {
  business: DashboardBusiness;
  categories: BusinessCategory[];
}) {
  const { copy, locale } = useLanguage();
  const settings = copy.dashboard.settingsScreen;
  const router = useRouter();

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Only fields with something to render live in state: the photo drives a preview, the approval
  // policy is a pair of cards rather than a control `FormData` can read, and the cancellation
  // window is echoed back inside its own hint as a sentence.
  const [photoUrl, setPhotoUrl] = useState(business.photoRef || business.photoUrl);
  const [approvalPolicy, setApprovalPolicy] = useState<ApprovalPolicy>(business.approvalPolicy);
  const [cancellationWindowHours, setCancellationWindowHours] = useState(
    String(business.cancellationWindowHours),
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setError(null);
    setFieldErrors({});

    startTransition(async () => {
      const result = await updateBusinessDetails({
        businessId: business.id,
        name: String(form.get('name') ?? ''),
        categoryId: String(form.get('categoryId') ?? ''),
        description: String(form.get('description') ?? ''),
        area: String(form.get('area') ?? ''),
        address: String(form.get('address') ?? ''),
        phone: String(form.get('phone') ?? ''),
        photoUrl: photoUrl.trim(),
        timezone: business.timezone,
        approvalPolicy,
        cancellationWindowHours,
        bookingNotes: String(form.get('bookingNotes') ?? ''),
        paymentNotes: String(form.get('paymentNotes') ?? ''),
      });

      if (!result.ok) {
        setFieldErrors(result.error.fields ?? {});
        // The field's own sentence says more than "correct the highlighted fields", and each field
        // is marked anyway — so the banner repeats the first one rather than the generic line.
        setError(Object.values(result.error.fields ?? {})[0] || result.error.message || settings.saveError);
        return;
      }

      setSavedAt(Date.now());
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className={`${surfaceCard} gap-6 p-4 sm:p-6`}>
      <DashboardSectionHeader icon={Settings} title={settings.title} description={settings.description} />

      {business.status === 'SUSPENDED' ? (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {settings.suspendedNotice}
        </p>
      ) : null}

      <Section title={settings.basicsSection}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={settings.businessName} required error={fieldErrors.name}>
            <input required name="name" defaultValue={business.name} className={fieldClassName} />
          </Field>
          <Field label={settings.category} required error={fieldErrors.categoryId}>
            <select
              required
              name="categoryId"
              defaultValue={business.categoryId}
              className={`${fieldClassName} picker-select cursor-pointer`}
            >
              <option value="" disabled>
                {settings.chooseCategory}
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {categoryPresentation(category.slug, category.name).name[locale]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label={settings.businessDescription} error={fieldErrors.description}>
          <textarea
            name="description"
            defaultValue={business.description}
            placeholder={settings.businessDescriptionPlaceholder}
            className={`${fieldClassName} min-h-24 resize-y`}
          />
        </Field>
      </Section>

      <Section title={settings.contactSection} icon={MapPin}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label={settings.city} required error={fieldErrors.area}>
            <input required name="area" defaultValue={business.area} className={fieldClassName} />
          </Field>
          <Field label={settings.address} required error={fieldErrors.address}>
            <input required name="address" defaultValue={business.address} className={fieldClassName} />
          </Field>
          <Field label={settings.phone} required error={fieldErrors.phone}>
            <input required name="phone" type="tel" defaultValue={business.phone} className={fieldClassName} />
          </Field>
        </div>
      </Section>

      <Section title={settings.mediaSection} icon={ImageIcon}>
        <div className="flex flex-col gap-4 sm:flex-row-reverse sm:items-start">
          <div className="flex-1">
            <Field label={settings.photoUrl} error={fieldErrors.photoUrl} hint={settings.photoHint}>
              <input
                name="photoUrl"
                value={photoUrl}
                onChange={(event) => setPhotoUrl(event.target.value)}
                placeholder={settings.photoUrlPlaceholder}
                className={fieldClassName}
                dir="ltr"
              />
            </Field>
          </div>
          <PhotoPreview url={photoUrl} alt={settings.photoAlt} emptyLabel={settings.photoEmpty} />
        </div>
      </Section>

      <Section title={settings.approvalSection} icon={ShieldCheck}>
        <div className="grid gap-3 md:grid-cols-2">
          <PolicyCard
            selected={approvalPolicy === 'AUTO'}
            onSelect={() => setApprovalPolicy('AUTO')}
            title={settings.autoApproval}
            description={settings.autoApprovalDescription}
          />
          <PolicyCard
            selected={approvalPolicy === 'MANUAL'}
            onSelect={() => setApprovalPolicy('MANUAL')}
            title={settings.manualApproval}
            description={settings.manualApprovalDescription}
          />
        </div>
      </Section>

      <Section title={settings.policySection} icon={CreditCard}>
        <div className="flex flex-col gap-4">
          <Field
            label={settings.cancellationWindow}
            error={fieldErrors.cancellationWindowHours}
            hint={settings.cancellationWindowHint.replace('{hours}', cancellationWindowHours || '0')}
          >
            <input
              type="number"
              min="0"
              max="168"
              value={cancellationWindowHours}
              onChange={(event) => setCancellationWindowHours(event.target.value)}
              className={`${fieldClassName} sm:max-w-40`}
            />
          </Field>
          <Field label={settings.bookingNotes} error={fieldErrors.bookingNotes}>
            <textarea
              name="bookingNotes"
              defaultValue={business.bookingNotes}
              placeholder={settings.bookingNotesPlaceholder}
              className={`${fieldClassName} min-h-24 resize-y`}
            />
          </Field>
          <Field label={settings.paymentNotes} error={fieldErrors.paymentNotes}>
            <textarea
              name="paymentNotes"
              defaultValue={business.paymentNotes}
              placeholder={settings.paymentNotesPlaceholder}
              className={`${fieldClassName} min-h-24 resize-y`}
            />
          </Field>
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--line)] pt-5">
        <button type="submit" disabled={isPending} className={`${actionButton} ${actionButtonLarge} shadow-lg`}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {isPending ? settings.saving : settings.save}
        </button>

        {error ? (
          <p role="alert" className="rounded-2xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
            {error}
          </p>
        ) : null}
        {savedAt && !error ? (
          <p
            role="status"
            className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {settings.saved}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/** A group of fields, marked by the brand dot the diary uses over its day, or the group's own icon. */
function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-t border-[var(--line)] pt-5 first-of-type:border-t-0 first-of-type:pt-0">
      <h3 className="flex items-center gap-2.5 text-sm font-extrabold text-[var(--foreground)]">
        {Icon ? (
          <Icon className="h-4 w-4 shrink-0 text-[var(--brand)]" aria-hidden="true" />
        ) : (
          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" aria-hidden="true" />
        )}
        {title}
      </h3>
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
      <span>
        {required ? <span className="text-[var(--brand)]">* </span> : null}
        {label}
      </span>
      {children}
      {hint && !error ? <span className="mt-1.5 block text-xs font-medium text-[var(--muted)]">{hint}</span> : null}
      {error ? <span className="mt-1.5 block text-xs font-semibold text-rose-600">{error}</span> : null}
    </label>
  );
}

/**
 * What the saved link actually renders.
 *
 * A photo field is the one input whose mistake is invisible on the screen that owns it — the image
 * appears on the discovery grid and the booking page — so this preview is the only place a broken
 * link gets caught before a client sees it.
 */
function PhotoPreview({ url, alt, emptyLabel }: { url: string; alt: string; emptyLabel: string }) {
  const [failed, setFailed] = useState(false);
  const trimmed = url.trim();

  return (
    <div className="h-24 w-32 shrink-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-slate-50">
      {trimmed.length > 0 && !failed ? (
        // An arbitrary host: next/image's remotePatterns cannot cover "whatever address the
        // business pasted".
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trimmed}
          alt={alt}
          onError={() => setFailed(true)}
          onLoad={() => setFailed(false)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center px-2 text-center text-xs font-semibold text-[var(--muted)]">
          {emptyLabel}
        </span>
      )}
    </div>
  );
}

/** The approval policy as two cards — a choice between two behaviours, each stating what it does. */
function PolicyCard({
  selected,
  onSelect,
  title,
  description,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-4 text-start transition-colors ${
        selected
          ? 'border-[var(--brand-blue)] bg-[var(--soft-violet)] ring-2 ring-[var(--brand-blue)]/20'
          : 'border-[var(--line)] bg-white hover:border-[var(--brand)]'
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-bold text-[var(--foreground)]">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
            selected ? 'border-[var(--brand-blue)]' : 'border-[var(--line)]'
          }`}
          aria-hidden="true"
        >
          {selected ? <span className="h-2 w-2 rounded-full bg-[var(--brand-blue)]" /> : null}
        </span>
        {title}
      </span>
      <span className="text-xs leading-5 text-[var(--muted)]">{description}</span>
    </button>
  );
}
