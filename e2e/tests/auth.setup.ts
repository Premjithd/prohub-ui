import { test as setup } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { assertBackendUp, ensureAdminAccount, ensureProAccount, ensureUserAccount } from '../fixtures/api';
import { promoteE2eAdmin, verifyE2eEmails } from '../fixtures/db';
import { stashSessionInLocalStorage } from '../fixtures/session';
import {
  ADMIN_STORAGE_STATE,
  E2E_ADMIN,
  E2E_PRO,
  E2E_USER,
  PRO_STORAGE_STATE,
  USER_STORAGE_STATE,
} from '../fixtures/test-users';

/**
 * Runs once before all tests: makes sure the e2e accounts exist, logs in
 * through the real UI once per role, and saves the browser storage so every
 * test starts already authenticated.
 */

setup('authenticate as user', async ({ page, request }) => {
  await assertBackendUp(request);
  await ensureUserAccount(request);
  // Posting jobs and bidding require a verified email; the verification code
  // is only delivered by email, so flip the flag directly in LocalDB.
  verifyE2eEmails();

  const login = new LoginPage(page);
  await login.goto();
  await login.loginAndWait('user', E2E_USER.email, E2E_USER.password);

  // The app keeps the session in sessionStorage, which storageState can't
  // capture — mirror it into localStorage first (fixtures/session.ts).
  await stashSessionInLocalStorage(page);
  await page.context().storageState({ path: USER_STORAGE_STATE });
});

setup('authenticate as pro', async ({ page, request }) => {
  await assertBackendUp(request);
  await ensureProAccount(request);
  verifyE2eEmails(); // also called here — the setup tests can run in any order

  const login = new LoginPage(page);
  await login.goto();
  await login.loginAndWait('pro', E2E_PRO.email, E2E_PRO.password);

  await stashSessionInLocalStorage(page);
  await page.context().storageState({ path: PRO_STORAGE_STATE });
});

setup('authenticate as admin', async ({ page, request }) => {
  await assertBackendUp(request);
  await ensureAdminAccount(request); // registered as a user...
  promoteE2eAdmin();                 // ...then promoted via SQL

  // Admins sign in through the user (Customer) login form
  const login = new LoginPage(page);
  await login.goto();
  await login.loginAndWait('user', E2E_ADMIN.email, E2E_ADMIN.password);

  await stashSessionInLocalStorage(page);
  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});
