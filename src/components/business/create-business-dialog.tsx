'use client';

import { Building2 } from 'lucide-react';

import { CreateBusinessForm } from '@/components/business/create-business-form';
import { Modal } from '@/components/common/modal';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { BusinessEntryArea, BusinessEntryCategory } from '@/types/business-entry';

type CreateBusinessDialogProps = {
  areas: BusinessEntryArea[];
  categories: BusinessEntryCategory[];
  isOpen: boolean;
  onClose: () => void;
};

export function CreateBusinessDialog({ areas, categories, isOpen, onClose }: CreateBusinessDialogProps) {
  const { copy } = useLanguage();
  const entry = copy.businessEntry;

  return (
    <Modal isOpen={isOpen} label={entry.createDialogTitle} closeLabel={entry.close} onClose={onClose}>
      <div className="p-5 sm:p-7">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-[var(--brand)]"><Building2 aria-hidden="true" size={23} /></span>
        <h1 className="mt-4 text-2xl font-black tracking-tight">{entry.createDialogTitle}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{entry.createDialogDescription}</p>
        <CreateBusinessForm categories={categories} areas={areas} onComplete={onClose} />
      </div>
    </Modal>
  );
}
