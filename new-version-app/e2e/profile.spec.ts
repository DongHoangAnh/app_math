import { test, expect } from '@playwright/test';

/**
 * E2E tests for the Profile screen (client/src/screens/ProfileScreen.tsx).
 *
 * Per the e2e convention (see e2e/README.md): one spec file per screen.
 * Selectors are anchored to stable, user-visible Vietnamese copy.
 *
 * NOTE: ProfileScreen sits behind the auth gate (it's a tab inside MainApp,
 * only mounted once a Supabase session exists). The repo has no seeded test
 * account, so the persistence test below can only run when a session is
 * already present; otherwise it skips at runtime rather than failing.
 */
test.describe('profile screen — settings persistence', () => {
  test('cài đặt Âm thanh được nhớ sau khi tải lại', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();

    // The "Âm thanh" Switch only exists on Hồ sơ, which requires being signed
    // in. If we can't reach it (no test session), skip — the storage layer is
    // covered by client/src/services/__tests__/settingsStorage.test.ts.
    const soundSwitch = page.getByRole('switch').first();
    const reachable = await soundSwitch
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    test.skip(!reachable, 'Profile tab is behind auth; no seeded test session available.');

    // Toggle and capture the resulting state.
    await soundSwitch.click();
    const after = await soundSwitch.getAttribute('aria-checked');

    // Reload — the value must persist via AsyncStorage (localStorage on web).
    await page.reload();
    const reloaded = page.getByRole('switch').first();
    await expect(reloaded).toHaveAttribute('aria-checked', after ?? 'false');
  });
});
