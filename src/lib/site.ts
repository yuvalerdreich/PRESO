/**
 * Single source of truth for the product's identity strings and for the
 * absolute origin used by auth redirects and email links.
 */
export const siteConfig = {
  name: 'Preso',
  tagline: 'Your spot. Secured.',
  description:
    'Find a business, pick the staff member you want, see the times they actually have free, and book.',
} as const;

/**
 * The absolute origin. Supabase auth redirects and the links inside
 * transactional emails cannot use a relative path, so this must be correct in
 * every environment.
 *
 * `NEXT_PUBLIC_SITE_URL` wins when set; Vercel injects `VERCEL_URL` (without a
 * scheme) on preview deployments; localhost is the development fallback.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;

  return 'http://localhost:3000';
}
