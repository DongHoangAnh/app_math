import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Login screen (client/src/screens/LoginScreen.tsx).
 *
 * Per the e2e convention (see e2e/README.md): one spec file per screen,
 * named after the screen. Multi-screen journeys (e.g. login → home → game,
 * or the match/đấu trận flow) belong in their own `*-flow` file, not here.
 *
 * Selectors are anchored to stable, user-visible copy. The app UI is in
 * Vietnamese.
 */
test.describe('login screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // React Native Web mounts into #root — wait for the app to hydrate.
    await expect(page.locator('#root')).toBeVisible();
  });

  test('renders the app brand and tagline', async ({ page }) => {
    await expect(page.getByText('MATHUP')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Thách đấu toán học 1v1/)).toBeVisible();
  });

  test('shows the email + password sign-in form', async ({ page }) => {
    await expect(page.getByPlaceholder('example@email.com')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    // Primary submit button.
    await expect(page.getByText('Đăng nhập', { exact: true })).toBeVisible();
  });

  test('offers Google sign-in and a register link', async ({ page }) => {
    await expect(page.getByText('Tiếp tục với Google')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Đăng ký ngay/)).toBeVisible();
  });

  test('email field accepts input', async ({ page }) => {
    const email = page.getByPlaceholder('example@email.com');
    await email.fill('player@example.com');
    await expect(email).toHaveValue('player@example.com');
  });
});
