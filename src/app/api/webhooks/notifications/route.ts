import { NextResponse, type NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';

import { renderNotificationEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';
import { log } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import type { NotificationType } from '@/types/domain';

/**
 * `POST /api/webhooks/notifications` (TECHNICAL_DESIGN.md §5.4, §7.4) — the transactional email
 * half of a notification.
 *
 * Driven by a **Supabase database webhook** on `INSERT into public.notifications`, so the trigger
 * that writes the row is the only thing that decides who gets told; this endpoint never queries for
 * "who should be notified". That matters most for the waitlist: `match_waitlist_for_slot()` writes
 * one row per eligible client inside the cancelling transaction (§12.15), so **every** waiting
 * client is emailed off the same commit rather than one at a time by a poller.
 *
 * Three properties this endpoint has to have, all of them because a webhook retries:
 *
 * 1. **Authenticated by a shared secret**, compared in constant time. Anyone who could POST here
 *    could otherwise make the app email arbitrary users.
 * 2. **Idempotent.** `notifications.emailed_at` is claimed with a conditional update *before* the
 *    send, so a retry that arrives while the first is in flight finds zero rows and stops. On a
 *    failed send the claim is released, so the row can be retried deliberately.
 * 3. **Never a 5xx for a failure it cannot fix.** An unknown type, a recipient with no email, or an
 *    unconfigured `RESEND_API_KEY` all answer 200 with a reason: a non-2xx makes Supabase retry the
 *    same impossible send forever.
 *
 * It uses the service-role client because it must read a row belonging to somebody else and reach
 * `auth.users` for their address — the one place besides cron where §1 permits that import.
 */
type WebhookBody = {
  type?: string;
  table?: string;
  record?: {
    id?: string;
    profile_id?: string;
    type?: string;
    payload?: Record<string, unknown>;
    emailed_at?: string | null;
  };
};

export async function POST(request: NextRequest) {
  const secret = process.env.NOTIFICATIONS_WEBHOOK_SECRET;
  if (!secret) {
    log.error({ event: 'webhook.notifications.misconfigured' });
    return NextResponse.json({ error: 'Webhook is not configured' }, { status: 503 });
  }

  const presented =
    request.headers.get('x-webhook-secret') ?? request.headers.get('authorization')?.replace(/^Bearer /, '') ?? '';

  if (!matches(presented, secret)) {
    log.warn({ event: 'webhook.notifications.unauthorized' });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as WebhookBody | null;
  const record = body?.record;

  if (!record?.id || !record.profile_id || !record.type) {
    return NextResponse.json({ error: 'Unexpected webhook body' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Claim the row first: `is('emailed_at', null)` makes this the mutual exclusion between two
  // deliveries of the same webhook. Zero rows back means someone else already has it.
  const { data: claimed, error: claimError } = await supabase
    .from('notifications')
    .update({ emailed_at: new Date().toISOString() })
    .eq('id', record.id)
    .is('emailed_at', null)
    .select('id')
    .maybeSingle();
  if (claimError) {
    log.error({ event: 'webhook.notifications.claim_failed', reason: claimError.message });
    return NextResponse.json({ error: 'Could not claim the notification' }, { status: 500 });
  }
  if (!claimed) {
    return NextResponse.json({ status: 'already-sent' });
  }

  const message = renderNotificationEmail(
    record.type as NotificationType,
    record.payload ?? {},
    // Filled in below; rendering first means an unknown type costs no lookup.
    '',
  );
  if (!message) {
    return NextResponse.json({ status: 'no-email-for-type', type: record.type });
  }

  const { data: user } = await supabase.auth.admin.getUserById(record.profile_id);
  const recipient = user?.user?.email;
  if (!recipient) {
    log.warn({ event: 'webhook.notifications.no_recipient', notificationId: record.id });
    return NextResponse.json({ status: 'no-recipient' });
  }

  const result = await sendEmail({ ...message, to: recipient });

  if (!result.ok) {
    // Release the claim so the row is not stranded as "emailed" when nothing was sent. A skipped
    // send (no API key) is released too — configuring the key later should not leave a silent hole.
    await supabase.from('notifications').update({ emailed_at: null }).eq('id', record.id);
    return NextResponse.json({ status: result.skipped ? 'skipped' : 'failed', reason: result.reason });
  }

  return NextResponse.json({ status: 'sent', id: result.id });
}

/** Constant-time compare, and length-safe: `timingSafeEqual` throws on a length mismatch. */
function matches(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
