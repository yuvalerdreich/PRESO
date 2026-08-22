'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { uuid } from '@/lib/validation/common';
import { action } from '@/server/action';
import { requireSession } from '@/server/guards';

import { z } from 'zod';

/**
 * Notifications (TECHNICAL_DESIGN.md §5.5, §4.5).
 *
 * One action, and only one, because `read_at` is the only column a user may ever write:
 * `notifications` rows are trigger-written, there is no INSERT policy or grant, and
 * `protect_notification_columns()` (0010_rls.sql) rejects an update touching `type`, `payload` or
 * anything else. A general-purpose update action would just be a 42501 generator.
 */

export const markNotificationRead = action(
  'markNotificationRead',
  z.object({ id: uuid }),
  async (input) => {
    await requireSession();
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', input.id);
    if (error) throw error;

    revalidatePath('/me/notifications');

    return { id: input.id };
  },
);

/** Marking the whole list read from the bell — same single writable column, applied in bulk. */
/**
 * Dismissing a notification outright (the bell's per-row "x", and a click on the row itself —
 * TECHNICAL_DESIGN.md §12.x). `0032_notification_delete.sql` is what makes this legal: the
 * original RLS design shipped with no DELETE policy at all ("no purge job in the MVP"), which was
 * about server-side retention, not a user dismissing their own notification.
 */
export const deleteNotification = action(
  'deleteNotification',
  z.object({ id: uuid }),
  async (input) => {
    await requireSession();
    const supabase = await createClient();

    const { error } = await supabase.from('notifications').delete().eq('id', input.id);
    if (error) throw error;

    revalidatePath('/me/notifications');

    return { id: input.id };
  },
);

export const markAllNotificationsRead = action(
  'markAllNotificationsRead',
  z.object({}).default({}),
  async () => {
    const profile = await requireSession();
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('profile_id', profile.id)
      .is('read_at', null);
    if (error) throw error;

    revalidatePath('/me/notifications');

    return { ok: true };
  },
);
