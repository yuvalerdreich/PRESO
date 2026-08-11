import { afterEach, describe, expect, it } from 'vitest';

import { siteConfig, siteUrl } from '@/lib/site';

/**
 * Proves the unit runner works end to end: TypeScript compiles, the `@/*` path
 * alias resolves, and assertions report. If this fails, no other unit test
 * result is meaningful.
 */
describe('unit test harness', () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;
  afterEach(() => {
    process.env.NEXT_PUBLIC_SITE_URL = original;
  });

  it('resolves modules through the @/* path alias', () => {
    expect(siteConfig.name).toBe('Perso');
  });

  it('siteUrl() prefers the explicit origin and strips a trailing slash', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://perso.example.com/';
    expect(siteUrl()).toBe('https://perso.example.com');
  });

  it('siteUrl() falls back to localhost when nothing is configured', () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_VERCEL_URL;
    delete process.env.VERCEL_URL;
    expect(siteUrl()).toBe('http://localhost:3000');
  });
});
