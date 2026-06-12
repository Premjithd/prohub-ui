import { test, expect } from '@playwright/test';
import { SettingsPage } from '../../pages/settings.page';
import { PRO_STORAGE_STATE, USER_STORAGE_STATE } from '../../fixtures/test-users';

test.describe('Settings — payment methods (User)', () => {
  test.use({ storageState: USER_STORAGE_STATE });

  // Methods persist in the DB across runs, so each test resets the list first.
  test.beforeEach(async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();
    await settings.deleteAllMethods();
  });

  test('shows the payment methods card with empty state', async ({ page }) => {
    const settings = new SettingsPage(page);
    await expect(settings.pmCard).toContainText('Payment Methods');
    await expect(settings.pmEmpty).toBeVisible();
    await expect(settings.addMethodButton).toBeVisible();
  });

  test('add a UPI method', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.addUpiMethod('e2etest@upi', 'E2E UPI');

    await expect(settings.pmItems).toHaveCount(1);
    const row = settings.methodRow('e2etest@upi');
    await expect(row).toBeVisible();
    await expect(row).toContainText('E2E UPI');
  });

  test('add a bank account — number is masked in the list', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.addBankMethod('E2E User', '123456789012', 'SBIN0001234', 'E2E Bank');

    const row = settings.methodRow('E2E Bank');
    await expect(row).toBeVisible();
    await expect(row).toContainText('****9012'); // masked by the API
    await expect(row).not.toContainText('123456789012');
  });

  test('set default moves the badge between methods', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.addUpiMethod('first@upi', 'First', true);
    await settings.addUpiMethod('second@upi', 'Second');

    await expect(settings.methodRow('first@upi').locator('.pm-default-badge')).toBeVisible();

    await settings.setDefault('second@upi');
    await expect(settings.methodRow('second@upi').locator('.pm-default-badge')).toBeVisible();
    await expect(settings.methodRow('first@upi').locator('.pm-default-badge')).toHaveCount(0);
  });

  test('delete removes the method', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.addUpiMethod('todelete@upi');
    await settings.deleteMethod('todelete@upi');
    await expect(settings.pmEmpty).toBeVisible();
  });

  test('UPI form requires a VPA', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.addMethodButton.click();
    await settings.saveButton.click();

    await expect(settings.addPanel.locator('.verif-error')).toBeVisible();
    await expect(settings.addPanel).toBeVisible(); // panel stays open
  });
});

test.describe('Settings — payment methods (Pro)', () => {
  test.use({ storageState: PRO_STORAGE_STATE });

  test('pro also sees the payment methods card', async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.goto();
    await expect(settings.pmCard).toContainText('Payment Methods');
    // Pro-specific hint about payouts
    await expect(settings.pmCard).toContainText(/payout/i);
  });
});
