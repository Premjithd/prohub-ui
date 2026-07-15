import { test, expect } from '../../fixtures/session';
import { PendingJobDetailsPage } from '../../pages/pending-job-details.page';
import {
  API_URL,
  apiAcceptBid,
  apiCreateJob,
  apiLogin,
  apiSetJobPhases,
  apiSubmitBid,
  apiSubmitCompletion,
  apiVerifyCompletion,
} from '../../fixtures/api';
import { setJobStatus } from '../../fixtures/db';
import { PRO_STORAGE_STATE, USER_STORAGE_STATE } from '../../fixtures/test-users';

const uniqueTitle = (slug: string) => `E2E ${slug} ${Date.now()}`;

/** job → bid → accepted, returns { job, bid } with tokens for both roles. */
async function stageAcceptedJob(request: any, slug: string) {
  const userToken = await apiLogin(request, 'user');
  const proToken = await apiLogin(request, 'pro');
  const job = await apiCreateJob(request, userToken, uniqueTitle(slug));
  const bid = await apiSubmitBid(request, proToken, job.id);
  await apiAcceptBid(request, userToken, job.id, bid.id);
  return { userToken, proToken, job, bid };
}

// ── Pro side: submitting completion ──────────────────────────────────────────

test.describe('Job completion — pro', () => {
  test.use({ storageState: PRO_STORAGE_STATE });

  test('pro marks an in-progress job as completed through the UI', async ({ page, request }) => {
    const { proToken, job } = await stageAcceptedJob(request, 'pro completes');
    // 'In Progress' normally requires payment — stage it; the Mark Completed
    // button additionally requires 100% phase progress
    setJobStatus(job.id, 'In Progress');
    await apiSetJobPhases(request, proToken, job.id, [
      { id: 'p1', title: 'Work', isCompleted: true, completedAt: new Date().toISOString() },
    ]);

    await page.goto(`/my-jobs-pro/${job.id}`);
    const markCompleted = page.getByRole('button', { name: /mark completed/i });
    await expect(markCompleted).toBeVisible({ timeout: 15_000 });
    await markCompleted.click();

    // Confirmation dialog
    const dialog = page.locator('mat-dialog-container');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /mark as completed/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    await expect(page.getByText(/marked as completed/i)).toBeVisible({ timeout: 15_000 });
  });

  test('completion cannot be submitted twice', async ({ request }) => {
    const { proToken, job } = await stageAcceptedJob(request, 'double completion');
    await apiSubmitCompletion(request, proToken, job.id);

    const res = await request.put(`${API_URL}/jobs/${job.id}/complete`, {
      headers: { Authorization: `Bearer ${proToken}` },
      data: { completionNotes: 'second attempt' },
    });
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain('already submitted');
  });
});

// ── Consumer side: verify, dispute, review ───────────────────────────────────

test.describe('Job completion & review — consumer', () => {
  test.use({ storageState: USER_STORAGE_STATE });

  test('user confirms submitted work and the job completes', async ({ page, request }) => {
    const { proToken, job } = await stageAcceptedJob(request, 'verify completion');
    await apiSubmitCompletion(request, proToken, job.id);

    const details = new PendingJobDetailsPage(page);
    await details.goto(job.id);

    await expect(page.getByText(/professional has submitted completion/i)).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /confirm work done/i }).click();

    const dialog = page.locator('mat-dialog-container');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /yes, confirm/i }).click();

    await expect(page.getByText(/work confirmed/i)).toBeVisible({ timeout: 15_000 });
    // Job is now Completed — the review section appears
    await expect(page.locator('.review-section')).toBeVisible();
  });

  test('user raises a dispute with a reason', async ({ page, request }) => {
    const { proToken, job } = await stageAcceptedJob(request, 'dispute completion');
    await apiSubmitCompletion(request, proToken, job.id);

    const details = new PendingJobDetailsPage(page);
    await details.goto(job.id);

    await page.getByRole('button', { name: /raise a dispute/i }).click();
    const dialog = page.locator('mat-dialog-container');
    await expect(dialog).toBeVisible();

    const submitDispute = dialog.getByRole('button', { name: /submit dispute/i });
    await expect(submitDispute).toBeDisabled(); // reason is required
    await dialog.locator('textarea').fill('Work left unfinished in the kitchen');
    await submitDispute.click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    // Dispute state: notice + reason shown, escape hatch available
    await expect(page.getByText(/dispute under review/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Work left unfinished in the kitchen')).toBeVisible();
    await expect(page.getByRole('button', { name: /accept work anyway/i })).toBeVisible();
  });

  test('user leaves a review on a completed job', async ({ page, request }) => {
    const { userToken, proToken, job } = await stageAcceptedJob(request, 'review job');
    await apiSubmitCompletion(request, proToken, job.id);
    await apiVerifyCompletion(request, userToken, job.id);

    const details = new PendingJobDetailsPage(page);
    await details.goto(job.id);

    await expect(page.locator('.review-section')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /leave a review/i }).click();

    const dialog = page.locator('mat-dialog-container');
    await expect(dialog).toBeVisible();
    // 4-star rating: click the 4th star button
    await dialog.locator('.star-row button').nth(3).click();
    await expect(dialog.getByText('4 / 5')).toBeVisible();
    await dialog.locator('textarea').fill('Great work, would hire again');
    await dialog.getByRole('button', { name: /submit review/i }).click();
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    await expect(page.getByText(/thank you for your review/i)).toBeVisible({ timeout: 15_000 });
    const submitted = page.locator('.review-submitted');
    await expect(submitted).toBeVisible();
    await expect(submitted).toContainText('4/5');
    await expect(submitted).toContainText('Great work, would hire again');
    // The "Leave a Review" prompt is gone once a review exists
    await expect(page.getByRole('button', { name: /leave a review/i })).toHaveCount(0);
  });

  test('a second review on the same job is rejected', async ({ request }) => {
    const { userToken, proToken, job } = await stageAcceptedJob(request, 'duplicate review');
    await apiSubmitCompletion(request, proToken, job.id);
    await apiVerifyCompletion(request, userToken, job.id);

    const first = await request.post(`${API_URL}/reviews/jobs/${job.id}`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { rating: 5, comment: 'first review' },
    });
    expect(first.ok(), await first.text()).toBe(true);

    const second = await request.post(`${API_URL}/reviews/jobs/${job.id}`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { rating: 1, comment: 'second review' },
    });
    expect(second.status()).toBe(409);
    expect(await second.text()).toContain('already been submitted');
  });
});
