import { log } from '@/lib/logger';

/**
 * Transactional email, over Resend's REST API (TECHNICAL_DESIGN.md §1, ARCHITECTURE.md §8).
 *
 * A `fetch` rather than the `resend` SDK: one POST with a JSON body is the entire surface used
 * here, and a dependency that wraps it would still need the same key, the same error handling and
 * the same care about not throwing into a webhook.
 *
 * **It never throws.** The caller is `POST /api/webhooks/notifications`, driven by a Supabase
 * database webhook: a thrown error there becomes a non-2xx, which Supabase retries, which sends
 * the same email again. A failed send is reported as `{ ok: false }` and logged, so the row simply
 * stays un-emailed and can be retried deliberately.
 *
 * With no `RESEND_API_KEY` configured it reports `skipped` instead of failing. The in-app
 * notification is written by a database trigger and does not depend on any of this (§7.4), so an
 * unconfigured environment loses the email and keeps the notification, which is the right way
 * round.
 */
export type EmailResult = { ok: true; id: string | null } | { ok: false; skipped?: true; reason: string };

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    log.warn({ event: 'email.skipped', reason: 'RESEND_API_KEY or EMAIL_FROM is not set' });
    return { ok: false, skipped: true, reason: 'email-not-configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!response.ok) {
      const reason = await response.text().catch(() => response.statusText);
      log.error({ event: 'email.failed', status: response.status, reason });
      return { ok: false, reason };
    }

    const body = (await response.json().catch(() => null)) as { id?: string } | null;
    log.info({ event: 'email.sent', id: body?.id ?? null });
    return { ok: true, id: body?.id ?? null };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown';
    log.error({ event: 'email.failed', reason });
    return { ok: false, reason };
  }
}
