import { Page, Locator, expect } from '@playwright/test';

export class SettingsPage {
  readonly page: Page;
  readonly header: Locator;
  readonly cards: Locator;

  // Payment methods card
  readonly pmCard: Locator;
  readonly pmList: Locator;
  readonly pmItems: Locator;
  readonly pmEmpty: Locator;
  readonly addMethodButton: Locator;
  readonly addPanel: Locator;
  readonly upiTypeButton: Locator;
  readonly bankTypeButton: Locator;
  readonly upiVpaInput: Locator;
  readonly bankHolderInput: Locator;
  readonly bankAccountInput: Locator;
  readonly bankIfscInput: Locator;
  readonly labelInput: Locator;
  readonly defaultCheckbox: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('.settings-header h1');
    this.cards = page.locator('.settings-card');

    this.pmCard = page.locator('.settings-card', { has: page.locator('mat-icon', { hasText: 'account_balance_wallet' }) });
    this.pmList = this.pmCard.locator('.pm-list');
    this.pmItems = this.pmCard.locator('.pm-item');
    this.pmEmpty = this.pmCard.locator('.pm-empty');
    this.addMethodButton = this.pmCard.locator('.btn-pm-add');
    this.addPanel = this.pmCard.locator('.pm-add-panel');
    this.upiTypeButton = this.addPanel.locator('.pm-type-toggle button').first();
    this.bankTypeButton = this.addPanel.locator('.pm-type-toggle button').last();
    this.upiVpaInput = this.addPanel.locator('input[placeholder="yourname@upi"]');
    this.bankHolderInput = this.addPanel.locator('input[placeholder="Account holder name"]');
    this.bankAccountInput = this.addPanel.locator('input[placeholder="Account number"]');
    this.bankIfscInput = this.addPanel.locator('input[placeholder="e.g. SBIN0001234"]');
    this.labelInput = this.addPanel.locator('input[placeholder="e.g. Personal, Business"]');
    this.defaultCheckbox = this.addPanel.locator('#pmIsDefault');
    this.saveButton = this.addPanel.locator('.btn-verify');
    this.cancelButton = this.addPanel.locator('.btn-resend');
  }

  async goto(): Promise<void> {
    await this.page.goto('/settings');
    await expect(this.header).toBeVisible();
    // Wait for profile + payment methods to finish loading
    await expect(this.pmCard).toBeVisible({ timeout: 15_000 });
  }

  /** Locator for the payment method row containing the given text (VPA, label, masked account). */
  methodRow(text: string): Locator {
    return this.pmItems.filter({ hasText: text });
  }

  async addUpiMethod(vpa: string, label?: string, makeDefault = false): Promise<void> {
    await this.addMethodButton.click();
    await expect(this.addPanel).toBeVisible();
    await this.upiTypeButton.click();
    await this.upiVpaInput.fill(vpa);
    if (label) await this.labelInput.fill(label);
    if (makeDefault) await this.defaultCheckbox.check();
    await this.saveButton.click();
    await expect(this.addPanel).toBeHidden({ timeout: 10_000 });
  }

  async addBankMethod(holder: string, account: string, ifsc: string, label?: string): Promise<void> {
    await this.addMethodButton.click();
    await expect(this.addPanel).toBeVisible();
    await this.bankTypeButton.click();
    await this.bankHolderInput.fill(holder);
    await this.bankAccountInput.fill(account);
    await this.bankIfscInput.fill(ifsc);
    if (label) await this.labelInput.fill(label);
    await this.saveButton.click();
    await expect(this.addPanel).toBeHidden({ timeout: 10_000 });
  }

  async deleteMethod(rowText: string): Promise<void> {
    const row = this.methodRow(rowText);
    await row.locator('.btn-pm-danger').click();
    await expect(row).toHaveCount(0, { timeout: 10_000 });
  }

  async setDefault(rowText: string): Promise<void> {
    const row = this.methodRow(rowText);
    await row.locator('.btn-pm-ghost').click();
    await expect(row.locator('.pm-default-badge')).toBeVisible({ timeout: 10_000 });
  }

  /** Deletes every saved payment method — used to reset state before a test. */
  async deleteAllMethods(): Promise<void> {
    while ((await this.pmItems.count()) > 0) {
      const before = await this.pmItems.count();
      await this.pmItems.first().locator('.btn-pm-danger').click();
      await expect(this.pmItems).toHaveCount(before - 1, { timeout: 10_000 });
    }
  }
}
