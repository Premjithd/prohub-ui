import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';
import { E2E_PRO, E2E_USER } from '../../fixtures/test-users';

// Login tests start from a clean (logged-out) browser
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Login', () => {
  test('user can log in and lands on the home page', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.loginAndWait('user', E2E_USER.email, E2E_USER.password);

    await expect(page).toHaveURL('/');
    // Token must be in localStorage for the API interceptor
    const hasToken = await page.evaluate(() =>
      Object.keys(localStorage).some((k) => /token/i.test(k) && !!localStorage.getItem(k))
    );
    expect(hasToken).toBe(true);
  });

  test('pro can log in', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.loginAndWait('pro', E2E_PRO.email, E2E_PRO.password);

    await expect(page).not.toHaveURL(/\/auth\/login/);
  });

  test('wrong credentials show an error and stay on login', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    // Nonexistent account — same error path, without adding failed-login
    // attempts to the real e2e account (5 failures lock it).
    await login.login('user', 'nobody@yprohub.test', 'wrong-password-123');

    await expect(login.errorBanner).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/auth\/login/);
  });

  test('empty form cannot be submitted', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();
    await expect(login.signInButton).toBeDisabled();
  });

  test('role tabs switch between Customer and Professional', async ({ page }) => {
    const login = new LoginPage(page);
    await login.goto();

    await expect(login.customerTab).toHaveClass(/active/); // default
    await login.professionalTab.click();
    await expect(login.professionalTab).toHaveClass(/active/);
    await expect(login.customerTab).not.toHaveClass(/active/);
  });
});
