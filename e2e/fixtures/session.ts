import { test as base, expect, BrowserContext, Page } from '@playwright/test';

/**
 * The app keeps auth state in sessionStorage (so closing the browser window
 * signs the user out), but Playwright's storageState only captures cookies and
 * localStorage. Bridge:
 *
 *  - auth.setup.ts calls stashSessionInLocalStorage() after logging in, so the
 *    saved .auth/*.json files carry the session under localStorage;
 *  - the `test` exported here (drop-in for @playwright/test's) seeds each new
 *    tab's sessionStorage from localStorage before the app boots.
 *
 * Specs that create contexts manually (browser.newContext) must call
 * seedSessionFromLocalStorage(context) before opening a page.
 */

export async function stashSessionInLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)!;
      localStorage.setItem(key, sessionStorage.getItem(key)!);
    }
  });
}

const SEEDED_FLAG = '__e2e_session_seeded';

export async function seedSessionFromLocalStorage(context: BrowserContext): Promise<void> {
  await context.addInitScript((flag) => {
    // Seed only once per tab: a test that logs out (clearing sessionStorage)
    // must stay logged out across subsequent navigations.
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, '1');
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      sessionStorage.setItem(key, localStorage.getItem(key)!);
    }
  }, SEEDED_FLAG);
}

export const test = base.extend({
  context: async ({ context }, use) => {
    await seedSessionFromLocalStorage(context);
    await use(context);
  },
});

export { expect };
