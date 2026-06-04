import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Register screen (client/src/screens/RegisterScreen.tsx).
 *
 * RegisterScreen is reached from the Login screen via the "Đăng ký ngay" link
 * (the unauthenticated stack starts at Login). Per the e2e convention these
 * tests still belong to the Register *screen*, so they live here — the click
 * through Login is just navigation setup, not a multi-screen flow.
 *
 * Selectors are anchored to stable, user-visible Vietnamese copy.
 */
test.describe('register screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
    // Navigate Login → Register.
    await page.getByText(/Đăng ký ngay/).click({ timeout: 20_000 });
    await expect(page.getByText('Tạo Tài Khoản')).toBeVisible({ timeout: 20_000 });
  });

  test('renders the register hero and tagline', async ({ page }) => {
    await expect(page.getByText('Tạo Tài Khoản')).toBeVisible();
    await expect(page.getByText(/Tham gia cộng đồng MathUp/)).toBeVisible();
  });

  test('shows all four sign-up fields', async ({ page }) => {
    await expect(page.getByPlaceholder('Nguyễn Văn A')).toBeVisible();
    await expect(page.getByPlaceholder('email@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('Tối thiểu 8 ký tự')).toBeVisible();
    await expect(page.getByPlaceholder('Nhập lại mật khẩu')).toBeVisible();
  });

  test('offers Google sign-up and a back-to-login link', async ({ page }) => {
    await expect(page.getByText('Đăng ký với Google')).toBeVisible();
    await expect(page.getByText(/Đăng nhập →/)).toBeVisible();
  });

  test('shows an inline name error for an invalid display name', async ({ page }) => {
    // A name with a forbidden char is rejected by validateDisplayName().
    await page.getByPlaceholder('Nguyễn Văn A').fill('Bob<script>');
    await expect(page.getByText(/Tên chứa ký tự không được phép/)).toBeVisible();
  });

  test('blocks submit when passwords do not match', async ({ page }) => {
    await page.getByPlaceholder('Nguyễn Văn A').fill('Nguyen Van A');
    await page.getByPlaceholder('email@example.com').fill('player@example.com');
    await page.getByPlaceholder('Tối thiểu 8 ký tự').fill('password123');
    await page.getByPlaceholder('Nhập lại mật khẩu').fill('different123');
    await page.getByText('Đăng ký', { exact: true }).click();
    await expect(page.getByText('Mật khẩu xác nhận không khớp')).toBeVisible();
  });

  test('navigates back to login', async ({ page }) => {
    await page.getByText(/Đăng nhập →/).click();
    await expect(page.getByText('MATHUP')).toBeVisible({ timeout: 20_000 });
  });
});
