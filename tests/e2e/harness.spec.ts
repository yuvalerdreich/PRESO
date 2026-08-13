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

test('discovery navigates to a business and its employee-specific services', async ({ page }) => {
  await page.goto('/search?category=hair-beauty');

  await page.getByRole('link', { name: 'לפרטי העסק' }).click();
  await expect(page).toHaveURL(/\/b\/b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001$/);

  await page.getByRole('link', { name: /לשירותים של זוהר לוי/ }).click();
  await expect(page).toHaveURL(/\/b\/b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001\/e\/e-zohar$/);
  await expect(page.getByRole('heading', { level: 2, name: /תספורת ועיצוב שיער/ })).toBeVisible();
});

test('an unknown path renders the not-found page, not a crash', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');

  await expect(
    page.getByRole('heading', { name: /couldn't find that page/i }),
  ).toBeVisible();
});

test('client appointments route is available from customer navigation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to English' }).click();

  await page.getByRole('link', { name: 'My appointments' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'My appointments and requests' })).toBeVisible();
});

test('business onboarding navigates to the demo join flow', async ({ page }) => {
  await page.goto('/onboarding');
  await page.getByRole('button', { name: 'Switch to English' }).click();

  await page.getByRole('link', { name: /find an existing business/i }).click();
  await expect(page).toHaveURL(/\/join$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Request to join a business' })).toBeVisible();
});

test('business dashboard navigates from overview to detailed appointments', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.getByRole('link', { name: /view all appointments/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/appointments$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Scheduled appointments' })).toBeVisible();
});

test('public header navigates to the business dashboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.getByRole('link', { name: 'Business owners & staff' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('business portal navigates to employee-linked services', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.getByRole('link', { name: 'Services' }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/services$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Service management' })).toBeVisible();
});
