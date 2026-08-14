import { expect, test } from '@playwright/test';

/**
 * Proves the E2E runner works: Playwright boots the dev server, navigates, and
 * asserts on rendered output. The five product flows (PDF §7) are built on top
 * of this from F3 onward.
 */
test('landing page loads with the Hebrew hero', async ({ page }) => {
  const response = await page.goto('/');

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole('heading', { level: 1, name: 'קביעת תורים מהירה לכל העסקים והמטפלים המובילים' }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
});

// Skipped: no language switcher is wired up yet — components/common/language-switcher.tsx
// is still an empty placeholder (CLAUDE.md §8). Remove .skip once it's implemented.
test.skip('landing page switches language direction to English', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Switch to English' }).click();

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Fast appointment booking for every leading business and provider',
    }),
  ).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
});

// Skipped: /search only renders a placeholder — result filtering isn't built yet (CLAUDE.md §8).
// Remove .skip once the real search results page is implemented.
test.skip('search filters business cards by category', async ({ page }) => {
  await page.goto('/search?category=fitness');

  await expect(page.getByText('Apex Fitness')).toBeVisible();
  await expect(page.getByText('Studio Zohar')).not.toBeVisible();
});

test('discovery navigates to a business and switches between its staff-linked services', async ({ page }) => {
  await page.goto('/b/b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001');

  // /b/[businessId] redirects to the merged profile + staff-picker + services page (§12.24).
  await expect(page).toHaveURL(/\/b\/b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001\/e\/e-zohar$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Studio Zohar - מספרת זוהר' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'תספורת ועיצוב שיער (גברים/נשים)' })).toBeVisible();

  await page.getByRole('link', { name: /מיה כהן/ }).click();

  await expect(page).toHaveURL(/\/b\/b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001\/e\/e-miya$/);
  await expect(page.getByRole('heading', { level: 3, name: 'גוונים וצבע אורגני מקצועי' })).toBeVisible();
});

test('an unknown path renders the not-found page, not a crash', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');

  await expect(
    page.getByRole('heading', { name: /couldn't find that page/i }),
  ).toBeVisible();
});

test('my appointments panel opens from the header button', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'פתיחת התורים שלי' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'התורים והבקשות שלי' })).toBeVisible();
});

// Skipped: /onboarding and /join only render placeholders — the demo forms aren't built yet
// (CLAUDE.md §8). Remove .skip once the real onboarding/join flow is implemented.
test.skip('business onboarding navigates to the demo join flow', async ({ page }) => {
  await page.goto('/onboarding');
  await page.getByRole('button', { name: 'Switch to English' }).click();

  await page.getByRole('link', { name: /find an existing business/i }).click();
  await expect(page).toHaveURL(/\/join$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Request to join a business' })).toBeVisible();
});

// Skipped: /dashboard and /dashboard/appointments only render placeholders (CLAUDE.md §8).
// Remove .skip once the real business dashboard is implemented.
test.skip('business dashboard navigates from overview to detailed appointments', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.getByRole('link', { name: /view all appointments/i }).click();
  await expect(page).toHaveURL(/\/dashboard\/appointments$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Scheduled appointments' })).toBeVisible();
});

// Skipped: /dashboard/services only renders a placeholder (CLAUDE.md §8).
// Remove .skip once the real service management page is implemented.
test.skip('business portal navigates to employee-linked services', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.getByRole('link', { name: 'Services' }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/services$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Service management' })).toBeVisible();
});
