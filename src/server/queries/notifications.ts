import { createClient } from '@/lib/supabase/server';
import type { NotificationItem } from '@/types/domain';

/**
 * Notification reads (TECHNICAL_DESIGN.md §4.5, §7).
 *
 * `notifications` rows are written only by triggers (0009_triggers.sql) — there is no INSERT
 * policy and no INSERT grant for `authenticated`. The only column a user may change is `read_at`,
 * enforced by `protect_notification_columns()`, which is why the write side of this module is a
 * single `markNotificationRead` action rather than a general update.
 *
 * §8.3 is worth remembering here: a notification is **never** the primary confirmation of
 * anything. The booking response is. These drive a bell and a list, and the UI stays correct if
 * the Realtime channel is down.
 */

export async function listNotifications(limit = 50): Promise<NotificationItem[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('id, type, payload, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    payload: (row.payload ?? {}) as Record<string, unknown>,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

/** The bell's badge. `head: true` asks Postgres for the count without shipping the rows. */
export async function countUnread(): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw error;

  return count ?? 0;
}
