import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly customerTab: Locator;
  readonly professionalTab: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.customerTab = page.locator('.type-btn', { hasText: 'Customer' });
    this.professionalTab = page.locator('.type-btn', { hasText: 'Professional' });
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.signInButton = page.locator('.btn-submit');
    this.errorBanner = page.locator('.error-banner');
  }

  async goto(): Promise<void> {
    await this.page.goto('/auth/login');
    await expect(this.emailInput).toBeVisible();
  }

  async login(role: 'user' | 'pro', email: string, password: string): Promise<void> {
    await (role === 'pro' ? this.professionalTab : this.customerTab).click();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  /** Login and wait until the app redirects away from the auth pages. */
  async loginAndWait(role: 'user' | 'pro', email: string, password: string): Promise<void> {
    await this.login(role, email, password);
    await this.page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15_000 });
  }
}
