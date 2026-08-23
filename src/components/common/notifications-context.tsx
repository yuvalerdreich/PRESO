'use client';

import { createContext, useContext } from 'react';

import type { NotificationItem } from '@/types/domain';

export type NotificationsContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  /**
   * Dismisses a notification outright — removes it from the list, not just from the unread count.
   * Returns a promise that resolves once the delete has actually committed server-side: a caller
   * that navigates right after MUST await this first, or a layout swap (a different route group
   * mounts a brand-new `NotificationsProvider` that fetches fresh from the server) can land before
   * the delete commits and the "removed" row reappears exactly as it was in the DB.
   */
  deleteNotification: (id: string) => Promise<void>;
};

export const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
