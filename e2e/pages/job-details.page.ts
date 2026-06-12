import { Page, Locator, expect } from '@playwright/test';

/** Pro's view of an open job: /job-details?id=:jobId — where bids are placed. */
export class JobDetailsPage {
  readonly page: Page;
  /** Main action button: "Send a Bid", or "Already Bid on This Job" (disabled). */
  readonly bidActionButton: Locator;
  readonly sendBidButton: Locator;
  readonly alreadyBidButton: Locator;
  readonly bidDialog: Locator;
  readonly quotedPriceInput: Locator;
  readonly durationInput: Locator;
  readonly messageInput: Locator;
  readonly dialogSubmitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.bidActionButton = page.locator('.job-actions button').first();
    this.sendBidButton = page.getByRole('button', { name: /send a bid/i });
    this.alreadyBidButton = page.getByRole('button', { name: /already bid on this job/i });
    this.bidDialog = page.locator('mat-dialog-container');
    this.quotedPriceInput = this.bidDialog.locator('input[formcontrolname="quotedPrice"]');
    this.durationInput = this.bidDialog.locator('input[formcontrolname="expectedDurationDays"]');
    this.messageInput = this.bidDialog.locator('textarea[formcontrolname="message"]');
    this.dialogSubmitButton = this.bidDialog.locator('.submit-btn');
  }

  async goto(jobId: number): Promise<void> {
    await this.page.goto(`/job-details?id=${jobId}`);
    await expect(this.bidActionButton).toBeVisible({ timeout: 15_000 });
  }

  async submitBid(amount: number, message: string): Promise<void> {
    await this.sendBidButton.click();
    await expect(this.bidDialog).toBeVisible();
    await this.quotedPriceInput.fill(String(amount));
    await this.durationInput.fill('3'); // required; commence date defaults to tomorrow
    await this.messageInput.fill(message);
    await this.dialogSubmitButton.click();
    await expect(this.bidDialog).toBeHidden({ timeout: 15_000 });
  }
}
