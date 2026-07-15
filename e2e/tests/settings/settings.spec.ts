import { test, expect } from '../../fixtures/session';
import { SettingsPage } from '../../pages/settings.page';
import { E2E_PRO, E2E_USER, PRO_STORAGE_STATE, USER_STORAGE_STATE } from '../../fixtures/test-users';

test.describe('Settings page (User)', () => {
  test.use({ storageState: USER_STORAGE_STATE });

  test('shows verification cards with the account email and phone', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();

    await expect(page.locator('.settings-card', { hasText: 'Email Verification' })).toContainText(E2E_USER.email);
    await expect(page.locator('.settings-card', { hasText: 'Phone Verification' })).toBeVisible();
  });

  test('does not show Pro-only cards', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();

    await expect(page.locator('.settings-card', { hasText: 'KYC Documents' })).toHaveCount(0);
    await expect(page.locator('.settings-card', { hasText: 'Business Account' })).toHaveCount(0);
  });
});

test.describe('Settings page (Pro)', () => {
  test.use({ storageState: PRO_STORAGE_STATE });

  test('shows KYC and Business Account cards', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();

    await expect(page.locator('.settings-card', { hasText: 'Email Verification' })).toContainText(E2E_PRO.email);
    await expect(page.locator('.settings-card', { hasText: 'KYC Documents' })).toBeVisible();
    await expect(page.locator('.settings-card', { hasText: 'Business Account' })).toBeVisible();
  });
});
