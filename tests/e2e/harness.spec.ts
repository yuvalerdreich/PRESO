import { expect, test } from '@playwright/test';

/**
 * Proves the E2E runner works: Playwright boots the dev server, navigates, and
 * asserts on rendered output. The five product flows (PDF §7) are built on top
 * of this from F3 onward.
 */
test('landing page loads and renders its heading', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Perso' })).toBeVisible();
});

test('an unknown path renders the not-found page, not a crash', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');

  await expect(
    page.getByRole('heading', { name: /couldn't find that page/i }),
  ).toBeVisible();
});
