import { expect, test } from '@playwright/test';

/**
 * Proves the E2E runner works: Playwright boots the dev server, navigates, and
 * asserts on rendered output. The five product flows (PDF §7) are built on top
 * of this from F3 onward.
 */
test('landing page loads and switches language direction', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole('heading', { level: 1, name: 'מצא עסק, תור ואיש צוות, וקבע תור מידי בזמן אמת' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Switch to English' }).click();

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Find a business, a service, and the right person for your next appointment',
    }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});

test('search filters business cards by category', async ({ page }) => {
  await page.goto('/search?category=fitness');

  await expect(page.getByText('סטודיו כושר ופילאטיס Apex Fitness')).toBeVisible();
  await expect(page.getByText('מספרת זוהר - Studio Zohar')).not.toBeVisible();
});

test('an unknown path renders the not-found page, not a crash', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');

  await expect(
    page.getByRole('heading', { name: /couldn't find that page/i }),
  ).toBeVisible();
});
