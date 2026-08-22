'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X } from 'lucide-react';

import { useNotifications } from '@/components/common/notifications-context';
import { formatNotification } from '@/lib/notifications/format';
import { useLanguage } from '@/lib/i18n/language-provider';
import type { NotificationItem } from '@/types/domain';

/**
 * The bell (TECHNICAL_DESIGN.md §12.x — the in-app replacement for Resend). Rendered only for a
 * signed-in user (`public-header.tsx`'s existing `currentUser` gate covers that for free).
 *
 * Deliberately **not** the shared `Modal` — that's a centered, backdrop-dimmed full-viewport
 * dialog, and this is meant to be a small anchored popup under the button, the same shape most
 * notification bells take. Closes on outside click and on Escape; independent of `Modal`'s own
 * `modalStack` since it was never part of that stack.
 *
 * A notification is dismissed outright (removed from the list, not just greyed out as "read") the
 * moment it's acted on — clicking the row, or the row's own "x" — by request: a read-but-still-
 * listed state was tried first and rejected as clutter.
 */
export function NotificationBell() {
  const { copy } = useLanguage();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={copy.notifications.bellLabel}
        aria-expanded={isOpen}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-[var(--foreground)] transition-colors hover:bg-[var(--soft-violet)]"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 end-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--brand)] px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label={copy.notifications.title}
          className="absolute end-0 top-full z-50 mt-2 flex max-h-[70vh] w-80 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
            <span className="text-sm font-bold text-[var(--foreground)]">{copy.notifications.title}</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium text-[var(--brand)] hover:underline"
              >
                {copy.notifications.markAllRead}
              </button>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">{copy.notifications.empty}</p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {notifications.map((item) => (
                  <NotificationRow key={item.id} item={item} onClose={() => setIsOpen(false)} />
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NotificationRow({ item, onClose }: { item: NotificationItem; onClose: () => void }) {
  const { copy } = useLanguage();
  const { deleteNotification } = useNotifications();
  const router = useRouter();
  const formatted = formatNotification(item.type, item.payload, copy);
  const isUnread = !item.readAt;

  /**
   * The delete must be *awaited* before navigating — `router.push` after a fire-and-forget delete
   * used to race a fresh `NotificationsProvider` mount on the destination layout (a different
   * route group, e.g. `/me/appointments`) reading the still-not-yet-deleted row straight back out
   * of the database. Waiting here is what makes the row actually gone for good, not just gone
   * until the next layout swap re-fetches it.
   */
  async function handleClick() {
    const href = formatted.href;
    await deleteNotification(item.id);
    onClose();
    if (href) router.push(href);
  }

  const content = (
    <div className="flex items-start gap-2 px-4 py-3">
      {isUnread ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--brand)]" aria-hidden="true" /> : <span className="mt-1.5 h-2 w-2 shrink-0" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${isUnread ? 'font-semibold text-[var(--foreground)]' : 'font-medium text-[var(--muted)]'}`}>
          {formatted.title}
        </p>
        {formatted.meta ? <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{formatted.meta}</p> : null}
        {formatted.when ? <p className="mt-0.5 text-xs text-[var(--muted)]">{formatted.when}</p> : null}
        {formatted.note ? <p className="mt-0.5 text-xs font-medium text-amber-600">{formatted.note}</p> : null}
      </div>
    </div>
  );

  // The dismiss button is a sibling of the main content, never nested inside it — a
  // button-inside-a-button is both invalid HTML and a real click-target ambiguity.
  return (
    <li className="flex items-stretch">
      <button type="button" onClick={handleClick} className="block min-w-0 flex-1 text-start transition-colors hover:bg-[var(--soft-violet)]">
        {content}
      </button>
      <button
        type="button"
        onClick={() => void deleteNotification(item.id)}
        aria-label={copy.notifications.dismiss}
        className="flex w-9 shrink-0 items-center justify-center text-[var(--muted)] transition-colors hover:bg-[var(--soft-violet)] hover:text-[var(--foreground)]"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </li>
  );
}
