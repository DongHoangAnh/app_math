import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright e2e config for the Expo **web** build of mathup-mobile.
 *
 * The tests drive the same React Native code that ships to iOS/Android,
 * rendered for web via `expo start --web` (Metro web bundler, port 8081).
 *
 * Run with:  npm run test:e2e
 * Docs: https://playwright.dev/docs/test-configuration
 */
const PORT = Number(process.env.E2E_PORT ?? 8081);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Each test gets a generous timeout — the web bundle is large.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Boot the Expo web dev server before the suite (reused if already running).
  webServer: {
    command: 'npm run web',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    // Metro's first web bundle can take a while to compile.
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
