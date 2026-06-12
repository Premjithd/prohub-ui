import { Page, Locator, expect } from '@playwright/test';

/** Consumer's view of one of their jobs: /pending-jobs/:jobId */
export class PendingJobDetailsPage {
  readonly page: Page;
  readonly bidsSection: Locator;
  readonly bidItems: Locator;
  readonly statusChip: Locator;
  readonly makePaymentButton: Locator;
  readonly progressSection: Locator;
  readonly phaseMilestones: Locator;
  readonly progressPercentage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.bidsSection = page.locator('.bids-section');
    this.bidItems = page.locator('.bid-item');
    this.statusChip = page.locator('mat-chip, .mat-mdc-chip').first();
    this.makePaymentButton = page.getByRole('button', { name: /make payment/i });
    this.progressSection = page.locator('.phases-progress-section');
    this.phaseMilestones = page.locator('.phase-milestone');
    this.progressPercentage = page.locator('.progress-percentage');
  }

  async goto(jobId: number): Promise<void> {
    await this.page.goto(`/pending-jobs/${jobId}`);
    // Job header loads after the API call resolves
    await expect(this.page.locator('mat-card').first()).toBeVisible({ timeout: 15_000 });
  }

  /** The bid row from the e2e pro (matched by business name or bid message). */
  bidRow(text: string): Locator {
    return this.bidItems.filter({ hasText: text });
  }

  async acceptBid(rowText: string): Promise<void> {
    await this.bidRow(rowText).getByRole('button', { name: /accept/i }).click();
    // Confirmation dialog
    const dialog = this.page.locator('.bid-confirmation-dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /^accept$/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
    // Accepting auto-opens a "send a message" dialog ~500ms later — dismiss it
    const messageDialog = this.page.locator('mat-dialog-container');
    try {
      await messageDialog.waitFor({ state: 'visible', timeout: 3_000 });
      await this.page.keyboard.press('Escape');
      await messageDialog.waitFor({ state: 'hidden', timeout: 5_000 });
    } catch {
      // dialog didn't open — fine
    }
  }

  async rejectBid(rowText: string, reason?: string): Promise<void> {
    await this.bidRow(rowText).getByRole('button', { name: /reject/i }).click();
    const dialog = this.page.locator('.bid-confirmation-dialog');
    await expect(dialog).toBeVisible();
    if (reason) {
      await dialog.locator('textarea').fill(reason);
    }
    await dialog.getByRole('button', { name: /^reject$/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });
  }
}
