import { Page, Locator, expect } from '@playwright/test';

/**
 * The Razorpay checkout dialog (RazorpayCheckoutComponent) opened from
 * "Make Payment" on an accepted job. Includes the payment method picker.
 */
export class CheckoutDialog {
  readonly page: Page;
  readonly dialog: Locator;
  readonly methodRows: Locator;
  readonly otherMethodRow: Locator;
  readonly noMethodsNotice: Locator;
  readonly addMethodLink: Locator;
  readonly orderTotal: Locator;
  readonly billingAddress: Locator;
  readonly payButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.dialog = page.locator('mat-dialog-container');
    this.methodRows = this.dialog.locator('.rzp-method-row');
    this.otherMethodRow = this.methodRows.filter({ hasText: 'Other method' });
    this.noMethodsNotice = this.dialog.locator('.rzp-no-methods');
    this.addMethodLink = this.dialog.locator('.rzp-add-link');
    this.orderTotal = this.dialog.locator('.rzp-total-val');
    this.billingAddress = this.dialog.locator('.rzp-addr-text');
    this.payButton = this.dialog.locator('.rzp-pay-btn');
  }

  methodRow(text: string): Locator {
    return this.methodRows.filter({ hasText: text });
  }

  async expectSelected(rowText: string): Promise<void> {
    await expect(this.methodRow(rowText)).toHaveClass(/active/);
  }

  async waitForOpen(): Promise<void> {
    await expect(this.dialog).toBeVisible({ timeout: 15_000 });
    await expect(this.payButton).toBeVisible({ timeout: 15_000 });
  }
}
