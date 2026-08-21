'use client';

import { useState } from 'react';
import { Scissors } from 'lucide-react';

import { ErrorNotice } from '@/components/common/error-dialog';
import { actionButton } from '@/components/common/button-styles';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import { fieldPadding, surfaceFieldSubtle } from '@/components/common/field-styles';
import { Modal } from '@/components/common/modal';
import { useLanguage } from '@/lib/i18n/language-provider';
import { deleteService, upsertService } from '@/server/actions/catalog';
import type { DashboardService } from '@/types/domain';

/**
 * Add or edit one service — the `service-form-modal.tsx` stub §9 has carried since the reorg,
 * filled in, and the `Modal` consumer CLAUDE.md predicted it would be.
 *
 * It writes through `upsertService`, which resolves the owning employee **from the session** rather
 * than from a field here: services belong to an employee, not a business (§3.8), so "whose service
 * is this" is never a choice on a form. That is also why the screen offers this dialog only on the
 * caller's own rows — a colleague's service is unreachable by construction and by RLS, not by a
 * disabled button.
 *
 * Deleting goes through `deleteService`, whose outcome is genuinely two different things: a hard
 * delete, or a flip to `INACTIVE` when appointments reference the row (§4.3 — the FK is
 * `on delete restrict`, so history survives). The dialog reports which one happened rather than
 * claiming "deleted" either way.
 */
export function ServiceFormModal({
  service,
  onClose,
  onSaved,
}: {
  /** The row being edited; omitted when adding. */
  service?: DashboardService;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { copy } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  // §12.60 — the delete confirmation is the app's dialog, not the browser's `confirm()`.
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const title = service ? copy.dashboard.services.formEditTitle : copy.dashboard.services.formAddTitle;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      const result = await upsertService({
        ...(service ? { id: service.id } : {}),
        name: String(form.get('name') ?? ''),
        description: String(form.get('description') ?? ''),
        price: String(form.get('price') ?? ''),
        durationMinutes: String(form.get('durationMinutes') ?? ''),
        bufferMinutes: String(form.get('bufferMinutes') ?? '0'),
        status: String(form.get('status') ?? 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
      });

      if (!result.ok) {
        setFormError(result.error.message || copy.dashboard.services.saveError);
        setFieldErrors(result.error.fields ?? {});
        return;
      }

      onSaved();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function remove() {
    if (!service || isSubmitting) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const result = await deleteService({ id: service.id });

      if (!result.ok) {
        setFormError(result.error.message || copy.dashboard.services.saveError);
        return;
      }

      // A soft delete leaves the row on screen, marked inactive — closing silently would read as a
      // failed delete.
      if (result.data.softDeleted) setNotice(copy.dashboard.services.deleteSoftNotice);
      onSaved();
    } finally {
      setIsSubmitting(false);
      setIsConfirmingDelete(false);
    }
  }

  return (
    <Modal onClose={onClose} closeLabel={copy.dashboard.services.close} ariaLabel={title}>
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--soft-violet)] text-[var(--brand)]">
          <Scissors className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            {copy.dashboard.services.formDescription}
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field
          name="name"
          label={copy.dashboard.services.nameLabel}
          placeholder={copy.dashboard.services.namePlaceholder}
          defaultValue={service?.name}
          error={fieldErrors.name}
          required
        />

        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-[var(--foreground)]">
            {copy.dashboard.services.descriptionLabel}
          </span>
          <textarea
            name="description"
            rows={3}
            defaultValue={service?.description}
            placeholder={copy.dashboard.services.descriptionPlaceholder}
            className={`${surfaceFieldSubtle} ${fieldPadding} resize-none`}
          />
          {fieldErrors.description ? <FieldError message={fieldErrors.description} /> : null}
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            name="price"
            type="number"
            min="0"
            step="1"
            label={copy.dashboard.services.priceLabel}
            defaultValue={service ? String(service.price) : ''}
            error={fieldErrors.price}
            required
          />
          <Field
            name="durationMinutes"
            type="number"
            min="5"
            step="5"
            label={copy.dashboard.services.durationLabel}
            defaultValue={String(service?.durationMinutes ?? 45)}
            error={fieldErrors.durationMinutes}
            required
          />
          <Field
            name="bufferMinutes"
            type="number"
            min="0"
            step="5"
            label={copy.dashboard.services.bufferLabel}
            defaultValue={String(service?.bufferMinutes ?? 0)}
            error={fieldErrors.bufferMinutes}
          />
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-bold text-[var(--foreground)]">
            {copy.dashboard.services.statusLabel}
          </span>
          <select
            name="status"
            defaultValue={service?.status ?? 'ACTIVE'}
            className={`picker-select ${surfaceFieldSubtle} ${fieldPadding} cursor-pointer font-semibold`}
          >
            <option value="ACTIVE">{copy.dashboard.services.statusActive}</option>
            <option value="INACTIVE">{copy.dashboard.services.statusInactive}</option>
          </select>
        </label>

        {formError ? <ErrorNotice description={formError} /> : null}
        {notice ? (
          <p role="status" className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {notice}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`${actionButton} flex-1 rounded-full px-4 py-3 text-sm`}
          >
            {isSubmitting ? copy.dashboard.services.saving : copy.dashboard.services.save}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className={`${actionButton} flex-1 rounded-full px-4 py-3 text-sm`}
          >
            {copy.dashboard.services.cancel}
          </button>
          {service ? (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              disabled={isSubmitting}
              className="w-full cursor-pointer text-sm font-bold text-rose-600 transition-colors hover:text-rose-700 disabled:opacity-60"
            >
              {copy.dashboard.services.delete}
            </button>
          ) : null}
        </div>
      </form>

      {isConfirmingDelete && service ? (
        <ConfirmDialog
          title={copy.dashboard.services.deleteConfirmTitle.replace('{name}', service.name)}
          description={copy.dashboard.services.deleteConfirm}
          confirmLabel={copy.dashboard.services.deleteConfirmAction}
          pendingLabel={copy.dashboard.services.deleting}
          cancelLabel={copy.dashboard.services.cancel}
          closeLabel={copy.dashboard.services.close}
          pending={isSubmitting}
          onConfirm={remove}
          onCancel={() => setIsConfirmingDelete(false)}
        />
      ) : null}
    </Modal>
  );
}

function Field({
  name,
  label,
  error,
  ...input
}: {
  name: string;
  label: string;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-bold text-[var(--foreground)]">{label}</span>
      <input name={name} {...input} className={`${surfaceFieldSubtle} ${fieldPadding}`} />
      {error ? <FieldError message={error} /> : null}
    </label>
  );
}

function FieldError({ message }: { message: string }) {
  return <span className="text-xs font-semibold text-rose-600">{message}</span>;
}
