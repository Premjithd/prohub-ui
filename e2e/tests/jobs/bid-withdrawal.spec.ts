import { test, expect } from '@playwright/test';
import { PendingJobDetailsPage } from '../../pages/pending-job-details.page';
import { API_URL, apiAcceptBid, apiCreateJob, apiLogin, apiSubmitBid } from '../../fixtures/api';
import { E2E_PRO, PRO_STORAGE_STATE, USER_STORAGE_STATE } from '../../fixtures/test-users';

const uniqueTitle = (slug: string) => `E2E ${slug} ${Date.now()}`;

test.describe('Bid withdrawal — pro', () => {
  test.use({ storageState: PRO_STORAGE_STATE });

  test('pro withdraws a pending bid from My Jobs', async ({ page, request }) => {
    const userToken = await apiLogin(request, 'user');
    const proToken = await apiLogin(request, 'pro');
    const job = await apiCreateJob(request, userToken, uniqueTitle('withdraw bid'));
    await apiSubmitBid(request, proToken, job.id);

    await page.goto(`/my-jobs-pro/${job.id}`);
    const withdrawButton = page.locator('.withdraw-btn');
    await expect(withdrawButton).toBeVisible({ timeout: 15_000 });

    // withdrawBid() uses a native confirm() dialog — accept it
    page.on('dialog', (dialog) => dialog.accept());
    await withdrawButton.click();

    await expect(page.getByText(/withdrawn/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(withdrawButton).toHaveCount(0); // only shown for Pending bids
  });

  test('an accepted bid cannot be withdrawn', async ({ request }) => {
    const userToken = await apiLogin(request, 'user');
    const proToken = await apiLogin(request, 'pro');
    const job = await apiCreateJob(request, userToken, uniqueTitle('withdraw accepted'));
    const bid = await apiSubmitBid(request, proToken, job.id);
    await apiAcceptBid(request, userToken, job.id, bid.id);

    const res = await request.post(`${API_URL}/jobs/${job.id}/bids/${bid.id}/withdraw`, {
      headers: { Authorization: `Bearer ${proToken}` },
    });
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain('Only pending bids can be withdrawn');
  });
});

test.describe('Bid withdrawal — consumer view', () => {
  test.use({ storageState: USER_STORAGE_STATE });

  test('a withdrawn bid shows as Withdrawn with no accept/reject actions', async ({ page, request }) => {
    const userToken = await apiLogin(request, 'user');
    const proToken = await apiLogin(request, 'pro');
    const job = await apiCreateJob(request, userToken, uniqueTitle('withdrawn view'));
    const bid = await apiSubmitBid(request, proToken, job.id);

    // Withdraw via API (the UI flow is covered in the pro spec above)
    const res = await request.post(`${API_URL}/jobs/${job.id}/bids/${bid.id}/withdraw`, {
      headers: { Authorization: `Bearer ${proToken}` },
    });
    expect(res.ok()).toBe(true);

    const details = new PendingJobDetailsPage(page);
    await details.goto(job.id);

    const row = details.bidRow(E2E_PRO.businessName);
    await expect(row).toBeVisible();
    await expect(row).toContainText(/withdrawn/i);
    await expect(row.getByRole('button', { name: /accept/i })).toHaveCount(0);
    await expect(row.getByRole('button', { name: /reject/i })).toHaveCount(0);
  });
});
