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

// Pinned seed ids (supabase/seed.sql §2, §4). Studio Zohar has exactly two staff, each with a
// service the other doesn't offer — which is what makes "a client sees only the *selected*
// employee's services" (PDF §8 rule 8) observable from the browser.
const BUSINESS_ZOHAR = 'b18f6ca9-0c44-45b8-a8d9-3e1a2c6a1001';
const EMPLOYEE_ZOHAR = 'e0000000-0000-4000-8000-000000000001';
const EMPLOYEE_MIYA = 'e0000000-0000-4000-8000-000000000002';

test('discovery navigates to a business and switches between its staff-linked services', async ({ page }) => {
  await page.goto(`/b/${BUSINESS_ZOHAR}`);

  // /b/[businessId] redirects to the merged profile + staff-picker + services page (§12.24).
  // Which employee it lands on is `listBusinessEmployees`' `order('position_title')` — a Hebrew
  // collation detail, not a product rule — so assert the shape, then pick a staff member below.
  await expect(page).toHaveURL(new RegExp(`/b/${BUSINESS_ZOHAR}/e/[0-9a-f-]{36}$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Studio Zohar - מספרת זוהר' })).toBeVisible();

  await page.getByRole('link', { name: /מיה כהן/ }).click();

  await expect(page).toHaveURL(new RegExp(`/b/${BUSINESS_ZOHAR}/e/${EMPLOYEE_MIYA}$`));
  await expect(page.getByRole('heading', { level: 3, name: 'גוונים וצבע אורגני מקצועי' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'עיצוב זקן וגילוח מסורתי' })).toBeHidden();

  await page.getByRole('link', { name: /זוהר לוי/ }).click();

  await expect(page).toHaveURL(new RegExp(`/b/${BUSINESS_ZOHAR}/e/${EMPLOYEE_ZOHAR}$`));
  await expect(page.getByRole('heading', { level: 3, name: 'עיצוב זקן וגילוח מסורתי' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'גוונים וצבע אורגני מקצועי' })).toBeHidden();
});

test('an unknown path renders the not-found page, not a crash', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');

  await expect(
    page.getByRole('heading', { name: /couldn't find that page/i }),
  ).toBeVisible();
});

// The sidebar entry is a link to the full appointments page, not a modal trigger. The page
// itself sits behind `/me/*`, which `proxy.ts` gates on a session, and the suite has no
// signed-in fixture yet — so this asserts the wiring plus the gate. Assert on the rendered
// page instead once an authenticated storageState exists.
test('my appointments entry links to the appointments page, behind the session gate', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'פתיחת התורים שלי' }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fme%2Fappointments$/);
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

// Skipped: /businesses/manage and /businesses/manage/appointments only render placeholders (CLAUDE.md §8).
// Remove .skip once the real business dashboard is implemented.
test.skip('business dashboard navigates from overview to detailed appointments', async ({ page }) => {
  await page.goto('/businesses/manage');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.getByRole('link', { name: /view all appointments/i }).click();
  await expect(page).toHaveURL(/\/businesses\/manage\/appointments$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Scheduled appointments' })).toBeVisible();
});

// Skipped: /businesses/manage/services only renders a placeholder (CLAUDE.md §8).
// Remove .skip once the real service management page is implemented.
test.skip('business portal navigates to employee-linked services', async ({ page }) => {
  await page.goto('/businesses/manage');
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await page.getByRole('link', { name: 'Services' }).first().click();
  await expect(page).toHaveURL(/\/businesses\/manage\/services$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Service management' })).toBeVisible();
});
