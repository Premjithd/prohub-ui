import { Page, Locator, expect } from '@playwright/test';

/** The central messaging page at /messages — same component for users and pros. */
export class MessagesPage {
  readonly page: Page;
  readonly conversationItems: Locator;
  readonly messageBubbles: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.conversationItems = page.locator('.conversation-item');
    this.messageBubbles = page.locator('.message-bubble');
    this.messageInput = page.locator('.message-input-section input');
    this.sendButton = page.locator('.message-input-section button');
  }

  async goto(): Promise<void> {
    await this.page.goto('/messages');
    await expect(this.page.locator('.messages-main')).toBeVisible({ timeout: 15_000 });
  }

  /** Opens the conversation whose list entry contains the given partner name. */
  async openConversation(partnerName: string): Promise<void> {
    const item = this.conversationItems.filter({ hasText: partnerName }).first();
    await expect(item).toBeVisible({ timeout: 15_000 });
    await item.click();
    await expect(this.messageInput).toBeVisible({ timeout: 15_000 });
  }

  async sendMessage(text: string): Promise<void> {
    await this.messageInput.fill(text);
    await this.sendButton.click();
    // The sent message renders as a bubble once the POST resolves
    await expect(this.messageBubbles.filter({ hasText: text })).toBeVisible({ timeout: 15_000 });
  }

  bubbleWith(text: string): Locator {
    return this.messageBubbles.filter({ hasText: text });
  }
}
