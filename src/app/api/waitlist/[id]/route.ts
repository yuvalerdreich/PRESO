import { AppError } from '@/lib/errors';
import { noContent, withErrorHandling } from '@/lib/http';
import { createClient } from '@/lib/supabase/route';
import { uuid } from '@/lib/validation/common';

/**
 * `DELETE /api/waitlist/[id]` (TECHNICAL_DESIGN.md §5.4) — leaving a waiting list.
 *
 * A genuine hard delete, unlike cancelling an appointment. A waitlist entry is a standing
 * request rather than a commitment: nothing references it, no notification is owed to anyone,
 * and there is no history worth preserving. `waitlist_employee_targets` cascades.
 *
 * `waitlist_entries` grants `delete` to `authenticated` with a policy scoped to the owner, so a
 * request for someone else's entry deletes nothing. That silence is why the row is read back
 * first — otherwise deleting a stranger's entry and deleting a non-existent one would both
 * answer `204`, and §5.4 distinguishes `403` from `404`.
 */
export const DELETE = withErrorHandling(
  'DELETE /api/waitlist/[id]',
  async (_request: Request, context: RouteContext<'/api/waitlist/[id]'>) => {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new AppError('UNAUTHENTICATED', 'You need to sign in to leave a waiting list.');

    const { id } = await context.params;
    const parsedId = uuid.safeParse(id);
    if (!parsedId.success) throw new AppError('NOT_FOUND', 'That waiting list entry no longer exists.');

    const { data: entry, error: lookupError } = await supabase
      .from('waitlist_entries')
      .select('id, client_profile_id')
      .eq('id', parsedId.data)
      .maybeSingle();
    if (lookupError) throw lookupError;

    // RLS already hides other clients' entries from this read, so "not visible" and "not there"
    // arrive identically — which is §8.1's deliberate merge: answering 403 would confirm the row
    // exists.
    if (!entry) throw new AppError('NOT_FOUND', 'That waiting list entry no longer exists.');
    if (entry.client_profile_id !== user.id) {
      throw new AppError('FORBIDDEN', "You can only leave your own waiting lists.");
    }

    const { error } = await supabase.from('waitlist_entries').delete().eq('id', parsedId.data);
    if (error) throw error;

    return noContent();
  },
);
