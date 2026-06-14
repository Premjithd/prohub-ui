import { Page, Locator, expect } from '@playwright/test';

/**
 * The consumer's "Choose Payment Amount" dialog (PayAmountDialogComponent),
 * opened from the payment tile's "Pay Now". Lets the user pick the requested
 * amount, the full remaining, or a custom amount before continuing to checkout.
 */
export class PayAmountDialog {
  readonly page: Page;
  readonly dialog: Locator;
  readonly requestedOption: Locator;
  readonly fullOption: Locator;
  readonly customOption: Locator;
  readonly customInput: Locator;
  readonly error: Locator;
  readonly continueButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('.pa-dialog');
    this.requestedOption = this.dialog.getByRole('radio', { name: /pay requested/i });
    this.fullOption = this.dialog.getByRole('radio', { name: /pay remaining/i });
    this.customOption = this.dialog.getByRole('radio', { name: /custom amount/i });
    this.customInput = this.dialog.locator('input[type="number"]');
    this.error = this.dialog.locator('.pa-error');
    this.continueButton = this.dialog.getByRole('button', { name: /continue to pay/i });
  }

  async waitForOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible({ timeout: 15_000 });
  }

  async continue(): Promise<void> {
    await this.continueButton.click();
  }
}
