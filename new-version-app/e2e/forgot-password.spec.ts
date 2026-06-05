import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Forgot-password screen
 * (client/src/screens/ForgotPasswordScreen.tsx).
 *
 * Reached from Login via the "Quên mật khẩu?" link. These tests deliberately
 * avoid submitting a *valid* email — doing so would call Supabase and send a
 * real reset email. We cover rendering, client-side validation, and navigation,
 * which are all side-effect free.
 *
 * Selectors are anchored to stable, user-visible Vietnamese copy.
 */
test.describe('forgot-password screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
    // Navigate Login → ForgotPassword.
    await page.getByText('Quên mật khẩu?').click({ timeout: 20_000 });
    // The reset button is unique to this screen.
    await expect(page.getByText('Gửi liên kết đặt lại')).toBeVisible({ timeout: 20_000 });
  });

  test('renders the hero, subtitle and email field', async ({ page }) => {
    await expect(page.getByText(/chúng tôi sẽ gửi liên kết/)).toBeVisible();
    await expect(page.getByPlaceholder('email@example.com')).toBeVisible();
  });

  test('submit is disabled until an email is entered', async ({ page }) => {
    const submit = page.getByText('Gửi liên kết đặt lại');
    // RNW renders a disabled pressable; clicking is a no-op, so the success
    // state must NOT appear.
    await submit.click({ force: true });
    await expect(page.getByText('Kiểm tra hộp thư!')).toHaveCount(0);
  });

  test('rejects an invalid email locally (no network call)', async ({ page }) => {
    await page.getByPlaceholder('email@example.com').fill('not-an-email');
    await page.getByText('Gửi liên kết đặt lại').click();
    await expect(page.getByText('Địa chỉ email không hợp lệ')).toBeVisible();
    // Validation short-circuits before the success screen.
    await expect(page.getByText('Kiểm tra hộp thư!')).toHaveCount(0);
  });

  test('navigates back to login', async ({ page }) => {
    await page.getByText(/Đăng nhập ngay →/).click();
    await expect(page.getByText('MATHUP')).toBeVisible({ timeout: 20_000 });
  });
});
