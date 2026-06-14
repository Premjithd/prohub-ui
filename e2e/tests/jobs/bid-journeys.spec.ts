import { test, expect } from '@playwright/test';
import { JobDetailsPage } from '../../pages/job-details.page';
import { PendingJobDetailsPage } from '../../pages/pending-job-details.page';
import { apiCreateJob, apiCreatePaymentRequest, apiLogin } from '../../fixtures/api';
import { E2E_PRO, PRO_STORAGE_STATE, USER_STORAGE_STATE } from '../../fixtures/test-users';

/**
 * Multi-actor bid journeys, fully through the UI: the pro and the user act in
 * separate browser sessions on the same job, and both sides' views are
 * verified after each step. (Single-step variants with API-staged data live
 * in job-lifecycle.spec.ts.)
 *
 * Only the initial job creation goes through the API — posting via the UI
 * needs the Nominatim address autocomplete, which isn't mockable reliably yet.
 */

const uniqueTitle = (slug: string) => `E2E ${slug} ${Date.now()}`;

test.describe('Bid journeys — pro and user through the UI', () => {
  // Default page is the consumer; the pro gets a second browser context
  test.use({ storageState: USER_STORAGE_STATE });

  async function newProPage(browser: import('@playwright/test').Browser) {
    const { baseURL } = test.info().project.use;
    const context = await browser.newContext({
      storageState: PRO_STORAGE_STATE,
      baseURL,
      ignoreHTTPSErrors: true,
    });
    return { context, page: await context.newPage() };
  }

  test('pro bids on a job and the bid reaches the job owner', async ({ page, browser, request }) => {
    const userToken = await apiLogin(request, 'user');
    const job = await apiCreateJob(request, userToken, uniqueTitle('bid journey'));

    // Pro: open the job and place a bid through the dialog
    const pro = await newProPage(browser);
    try {
      const proView = new JobDetailsPage(pro.page);
      await proView.goto(job.id);
      await proView.submitBid(1950, 'UI journey bid — can start this week.');
      await expect(proView.alreadyBidButton).toBeVisible({ timeout: 15_000 });

      // User: the bid is immediately visible with the quoted details
      const userView = new PendingJobDetailsPage(page);
      await userView.goto(job.id);
      const row = userView.bidRow(E2E_PRO.businessName);
      await expect(row).toBeVisible();
      await expect(row).toContainText('1,950');
      await expect(row).toContainText('UI journey bid — can start this week.');
      await expect(row).toContainText('Pending');
    } finally {
      await pro.context.close();
    }
  });

  test('user rejects the bid and the pro sees the rejection with a re-bid option', async ({ page, browser, request }) => {
    const userToken = await apiLogin(request, 'user');
    const job = await apiCreateJob(request, userToken, uniqueTitle('reject journey'));

    const pro = await newProPage(browser);
    try {
      // Pro bids through the UI
      const proView = new JobDetailsPage(pro.page);
      await proView.goto(job.id);
      await proView.submitBid(2100, 'Reject journey bid.');

      // User rejects it with a reason
      const userView = new PendingJobDetailsPage(page);
      await userView.goto(job.id);
      await userView.rejectBid(E2E_PRO.businessName, 'Budget too high for us');
      await expect(userView.bidRow(E2E_PRO.businessName)).toContainText('Rejected');

      // Pro revisits the job: rejection is shown and a new bid is allowed
      await pro.page.reload();
      await expect(pro.page.getByText(/your bid was not accepted/i)).toBeVisible({ timeout: 15_000 });
      await expect(pro.page.getByRole('button', { name: /submit new bid/i })).toBeVisible();
    } finally {
      await pro.context.close();
    }
  });

  test('user accepts the bid and both sides see the assignment', async ({ page, browser, request }) => {
    const userToken = await apiLogin(request, 'user');
    const job = await apiCreateJob(request, userToken, uniqueTitle('accept journey'));

    const pro = await newProPage(browser);
    try {
      // Pro bids through the UI
      const proView = new JobDetailsPage(pro.page);
      await proView.goto(job.id);
      await proView.submitBid(1600, 'Accept journey bid.');

      // User accepts it (page object also dismisses the follow-up message dialog)
      const userView = new PendingJobDetailsPage(page);
      await userView.goto(job.id);
      await userView.acceptBid(E2E_PRO.businessName);

      // User side: pro assigned, bids list gone. No "Pay Now" yet — the pro
      // must first raise a payment request.
      await expect(page.locator('.assigned-pro-section')).toBeVisible({ timeout: 15_000 });
      await expect(page.locator('.assigned-pro-section')).toContainText(E2E_PRO.businessName);
      await expect(userView.payNowButton).toHaveCount(0);
      await expect(userView.bidsSection).toHaveCount(0);

      // Once the pro requests full payment, the user's "Pay Now" appears.
      await apiCreatePaymentRequest(request, await apiLogin(request, 'pro'), job.id, { requestType: 'Full' });
      await page.reload();
      await expect(userView.payNowButton).toBeVisible({ timeout: 15_000 });

      // Pro side: job now shows the accepted state
      await pro.page.reload();
      await expect(pro.page.getByText(/accepted/i).first()).toBeVisible({ timeout: 15_000 });
    } finally {
      await pro.context.close();
    }
  });
});
