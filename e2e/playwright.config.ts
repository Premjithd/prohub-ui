import { defineConfig, devices } from '@playwright/test';

/**
 * yProHub UI end-to-end tests.
 *
 * Prerequisites:
 *  - Backend running: cd ProHubAPI/ServiceProviderAPI && dotnet watch run
 *    (listens on https://localhost:7042 — the Angular dev API URL)
 *  - The Angular dev server is started automatically by the webServer block
 *    below; if you already have `npm start` running it will be reused.
 *
 * Auth: tests/auth.setup.ts runs first, creates the e2e accounts via the
 * backend API if needed, logs in through the UI once per role, and saves
 * the browser storage to .auth/*.json. All other tests start pre-logged-in.
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  // Swap public/config.json -> config.e2e.json for the run (points the UI at the
  // local Test backend), then restore the committed file afterward.
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  // Files run in parallel, but tests within a file run in order — tests in
  // one file often share account state (e.g. payment methods CRUD).
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  timeout: 45_000,

  use: {
    baseURL: 'http://localhost:4200',
    // Backend dev cert (https://localhost:7042) is self-signed
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    // Creates accounts (if missing) and saves logged-in storage state per role
    { name: 'setup', testMatch: /auth\.setup\.ts/ },

    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm start',
    cwd: '..',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
