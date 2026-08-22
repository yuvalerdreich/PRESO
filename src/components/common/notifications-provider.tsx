'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { NotificationsContext } from '@/components/common/notifications-context';
import {
  deleteNotification as deleteNotificationAction,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/server/actions/notifications';
import { createClient } from '@/lib/supabase/client';
import type { NotificationItem } from '@/types/domain';

/**
 * Seeds from the server (same shape as `AppointmentsPanelProvider`), then keeps itself live with
 * one Realtime subscription on `notifications` filtered to this profile — RLS still applies to
 * `postgres_changes`, so this can never see another user's row regardless of the filter. A fresh
 * INSERT is prepended and the unread badge increments by 1, without a page refresh.
 */
export function NotificationsProvider({
  profileId,
  initialNotifications,
  initialUnreadCount,
  children,
}: {
  profileId: string;
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
  children: ReactNode;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const supabaseRef = useRef(createClient());

  // Kept fresh every render so `markRead` can check "was this already read" without a stale
  // closure over `notifications` — `useCallback([])` below would otherwise capture whichever
  // `notifications` value existed on the render that first created the callback.
  const notificationsRef = useRef(notifications);
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`notifications:${profileId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `profile_id=eq.${profileId}` },
        (payload) => {
          const row = payload.new as {
            id: string;
            type: NotificationItem['type'];
            payload: Record<string, unknown>;
            read_at: string | null;
            created_at: string;
          };

          setNotifications((current) => [
            {
              id: row.id,
              type: row.type,
              payload: row.payload ?? {},
              readAt: row.read_at,
              createdAt: row.created_at,
            },
            ...current,
          ]);
          setUnreadCount((count) => count + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profileId]);

  const markRead = useCallback((id: string) => {
    const target = notificationsRef.current.find((item) => item.id === id);
    if (!target || target.readAt) return;

    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)),
    );
    setUnreadCount((count) => Math.max(0, count - 1));
    void markNotificationRead({ id });
  }, []);

  const markAllRead = useCallback(() => {
    const now = new Date().toISOString();
    setNotifications((current) => current.map((item) => (item.readAt ? item : { ...item, readAt: now })));
    setUnreadCount(0);
    void markAllNotificationsRead({});
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    const target = notificationsRef.current.find((item) => item.id === id);
    const wasUnread = Boolean(target && !target.readAt);

    setNotifications((current) => current.filter((item) => item.id !== id));
    if (wasUnread) setUnreadCount((count) => Math.max(0, count - 1));
    // Awaited, not fire-and-forget: a caller that navigates right after (a notification's own
    // row click) needs the delete to have actually committed before a fresh layout's server fetch
    // can run, or the "removed" row comes back exactly as the DB still has it.
    await deleteNotificationAction({ id });
  }, []);

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, markRead, markAllRead, deleteNotification }}>
      {children}
    </NotificationsContext.Provider>
  );
}
