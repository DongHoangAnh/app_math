import { test, expect, type Page } from '@playwright/test';

/**
 * E2E happy path for the Practice screen (client/src/screens/PracticeScreen.tsx
 * + the Practice/ phase folder: ConfigPhase → PlayPhase → SummaryPhase).
 *
 * Per the e2e convention (see e2e/README.md): one spec file per screen, named
 * after the screen in kebab-case. Selectors are anchored to stable, visible
 * Vietnamese copy actually rendered by the implemented screens.
 *
 * NOTE: Practice lives inside MainApp (the "Luyện tập đơn" card on Home), which
 * is only mounted once a Supabase session exists. The repo has no seeded test
 * account, so — exactly like profile.spec.ts — this test skips at runtime when
 * the authenticated Home isn't reachable, rather than failing. The pure session
 * logic is covered by the unit suites under shared/__tests__ + server/__tests__.
 *
 * The "Cổ điển" preset is a fixed 10-question session. We don't need to answer
 * correctly — answering through all 10 questions (right or wrong) ends the
 * session and routes to the summary. We tap a digit + ✓ for numeric questions
 * and a comparison button for < = > questions, looping until "Kết quả" appears.
 */

// One numeric answer + submit, or one comparison pick — whichever keypad is up.
async function answerOneQuestion(page: Page): Promise<void> {
  const submit = page.getByText('✓', { exact: true });
  const isNumeric = await submit.isVisible().catch(() => false);

  if (isNumeric) {
    // Enter any digit so ✓ becomes enabled, then submit.
    await page.getByText('1', { exact: true }).first().click();
    await submit.click();
    return;
  }

  // Comparison question — pick whichever operator is rendered first.
  for (const op of ['<', '=', '>']) {
    const btn = page.getByText(op, { exact: true }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click();
      return;
    }
  }
}

test.describe('practice screen — fixed "Cổ điển" happy path', () => {
  test('vào luyện tập → chọn Cổ điển → làm hết câu → tới Kết quả', async ({ page }) => {
    await page.goto('/');
    // React Native Web mounts into #root — wait for the app to hydrate.
    await expect(page.locator('#root')).toBeVisible();

    // The Practice entry card only exists on the authenticated Home. If we
    // can't reach it (no seeded test session), skip rather than fail.
    const entry = page.getByText('Luyện tập đơn', { exact: true });
    const reachable = await entry
      .waitFor({ state: 'visible', timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    test.skip(!reachable, 'Practice is behind auth; no seeded test session available.');

    // Home → Practice (ConfigPhase).
    await entry.click();
    await expect(page.getByText('Chọn kiểu luyện tập để bắt đầu')).toBeVisible({ timeout: 15_000 });

    // Pick the fixed "Cổ điển" preset → PlayPhase starts immediately.
    await page.getByText('Cổ điển', { exact: true }).click();

    // Answer through the fixed 10-question session. Stop as soon as the summary
    // heading appears. Cap iterations generously (> 10) to stay bounded.
    const summary = page.getByText('Kết quả', { exact: true });
    for (let i = 0; i < 14; i++) {
      if (await summary.isVisible().catch(() => false)) break;
      await answerOneQuestion(page);
      // Brief settle for the ~600ms reveal + next-question transition.
      await page.waitForTimeout(700);
    }

    // SummaryPhase: heading + the per-operation accuracy section.
    await expect(summary).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Độ chính xác theo phép toán')).toBeVisible();
  });
});
