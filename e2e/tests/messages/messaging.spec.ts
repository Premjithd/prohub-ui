import { test, expect } from '@playwright/test';
import { MessagesPage } from '../../pages/messages.page';
import { apiLoginWithId, apiSendMessage } from '../../fixtures/api';
import { E2E_PRO, E2E_USER, PRO_STORAGE_STATE, USER_STORAGE_STATE } from '../../fixtures/test-users';

/**
 * Messaging between the consumer and the pro through the /messages page.
 * The conversation list shows the pro's business name to the user, and the
 * user's full name to the pro. Messages persist across runs, so every
 * assertion uses run-unique message text.
 */

const userFullName = `${E2E_USER.firstName} ${E2E_USER.lastName}`;

test.describe('Messaging — user and pro', () => {
  test.use({ storageState: USER_STORAGE_STATE });

  test('user receives a pro message and replies; pro sees the reply', async ({ page, browser, request }) => {
    const user = await apiLoginWithId(request, 'user');
    const pro = await apiLoginWithId(request, 'pro');

    const opener = `E2E opener ${Date.now()}`;
    const reply = `E2E reply ${Date.now()}`;

    // Pro opens the conversation (also creates it on first ever run)
    await apiSendMessage(request, pro.token, 'Pro', user.id, opener);

    // User: reads the message and replies through the UI
    const userMessages = new MessagesPage(page);
    await userMessages.goto();
    await userMessages.openConversation(E2E_PRO.businessName);
    await expect(userMessages.bubbleWith(opener)).toBeVisible();
    await userMessages.sendMessage(reply);

    // Pro: sees the user's reply in their own session
    const { baseURL } = test.info().project.use;
    const proContext = await browser.newContext({
      storageState: PRO_STORAGE_STATE,
      baseURL,
      ignoreHTTPSErrors: true,
    });
    try {
      const proMessages = new MessagesPage(await proContext.newPage());
      await proMessages.goto();
      await proMessages.openConversation(userFullName);
      await expect(proMessages.bubbleWith(opener)).toBeVisible();
      await expect(proMessages.bubbleWith(reply)).toBeVisible();
    } finally {
      await proContext.close();
    }
  });

  test('conversation list previews the most recent message', async ({ page, request }) => {
    const user = await apiLoginWithId(request, 'user');
    const pro = await apiLoginWithId(request, 'pro');

    const latest = `E2E preview check ${Date.now()}`;
    await apiSendMessage(request, pro.token, 'Pro', user.id, latest);

    const messages = new MessagesPage(page);
    await messages.goto();
    const conversation = messages.conversationItems.filter({ hasText: E2E_PRO.businessName }).first();
    await expect(conversation).toBeVisible();
    await expect(conversation.locator('.conversation-last-message')).toContainText('E2E preview check');
  });

  test('send button is disabled while the input is empty', async ({ page, request }) => {
    const user = await apiLoginWithId(request, 'user');
    const pro = await apiLoginWithId(request, 'pro');
    // Ensure the conversation exists so the input section renders
    await apiSendMessage(request, pro.token, 'Pro', user.id, `E2E enable check ${Date.now()}`);

    const messages = new MessagesPage(page);
    await messages.goto();
    await messages.openConversation(E2E_PRO.businessName);

    await expect(messages.sendButton).toBeDisabled();
    await messages.messageInput.fill('hello');
    await expect(messages.sendButton).toBeEnabled();
  });
});
