import { Page, Locator, expect } from '@playwright/test';

export class PostJobPage {
  readonly page: Page;
  readonly heroTitle: Locator;
  readonly activeStep: Locator;
  readonly titleInput: Locator;
  readonly categoryButtons: Locator;
  readonly descriptionInput: Locator;
  readonly locationInput: Locator;
  readonly addressItems: Locator;
  readonly selectedAddress: Locator;
  readonly nextButton: Locator;
  readonly backButton: Locator;
  readonly errorTexts: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heroTitle = page.locator('.post-job-hero h1');
    this.activeStep = page.locator('.steps-indicator .step.active .step-num');
    this.titleInput = page.locator('#title, input[formcontrolname="title"]');
    this.categoryButtons = page.locator('.category-grid .category-btn');
    this.descriptionInput = page.locator('textarea[formcontrolname="description"]');
    this.locationInput = page.locator('.autocomplete-container input');
    this.addressItems = page.locator('.address-dropdown .address-item');
    this.selectedAddress = page.locator('.selected-address-box');
    this.nextButton = page.locator('.form-step .btn-primary', { hasText: /next/i });
    this.backButton = page.locator('.form-step .btn-secondary', { hasText: /back/i });
    this.errorTexts = page.locator('.error-text');
  }

  async goto(): Promise<void> {
    await this.page.goto('/post-job');
    await expect(this.heroTitle).toBeVisible();
  }

  async expectStep(step: number): Promise<void> {
    await expect(this.activeStep).toHaveText(String(step));
  }

  async fillStep1(title: string, description: string): Promise<void> {
    await this.titleInput.fill(title);
    // Categories load from the API — wait for at least one to render
    await expect(this.categoryButtons.first()).toBeVisible({ timeout: 15_000 });
    await this.categoryButtons.first().click();
    await this.descriptionInput.fill(description);
    await this.selectLocation('Thiruvananthapuram');
  }

  /**
   * Drives the Service Location autocomplete: types a query, waits for the
   * prediction dropdown, and selects the first result. The dropdown items fire
   * on `mousedown` (before the input's blur hides the list), so dispatch that
   * event directly to avoid a focus/detach race.
   */
  async selectLocation(query: string): Promise<void> {
    await this.locationInput.fill(query);
    await expect(this.addressItems.first()).toBeVisible({ timeout: 15_000 });
    await this.addressItems.first().dispatchEvent('mousedown');
    await expect(this.selectedAddress).toBeVisible({ timeout: 15_000 });
  }
}
