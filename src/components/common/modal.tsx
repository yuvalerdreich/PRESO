'use client';

import { useEffect, useId, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type ModalProps = {
  children: ReactNode;
  isOpen: boolean;
  label: string;
  closeLabel: string;
  onClose: () => void;
};

export function Modal({ children, isOpen, label, closeLabel, onClose }: ModalProps) {
  const labelId = useId();

  useEffect(() => {
    if (!isOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#11162f]/60 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        className="max-h-[min(46rem,calc(100vh-2rem))] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/20 bg-[var(--background)] shadow-[0_30px_80px_rgba(11,13,34,.36)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] bg-white/85 px-5 py-4 backdrop-blur sm:px-7">
          <p id={labelId} className="sr-only">{label}</p>
          <span />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-10 items-center justify-center rounded-xl text-[var(--muted)] transition hover:bg-[var(--soft-violet)] hover:text-[var(--brand)] focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
            aria-label={closeLabel}
          >
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
    ,
    document.body,
  );
}
