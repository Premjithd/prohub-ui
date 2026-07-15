import { test, expect } from '../../fixtures/session';
import {
  API_URL,
  apiAcceptBid,
  apiCreateJob,
  apiDisputeCompletion,
  apiLogin,
  apiSubmitBid,
  apiSubmitCompletion,
} from '../../fixtures/api';
import { ADMIN_STORAGE_STATE } from '../../fixtures/test-users';

/**
 * Admin dispute resolution and the refund flow.
 *
 * The "complete" resolution (in the pro's favour) is fully testable. The
 * "refund" resolution executes a real Razorpay refund server-side, so only
 * its validation paths are covered here (no payment / wrong status / bad
 * resolution); the actual refund needs a live Razorpay payment.
 */

const uniqueTitle = (slug: string) => `E2E ${slug} ${Date.now()}`;

/** job → bid → accepted → completion submitted → disputed by the user. */
async function stageDisputedJob(request: any, slug: string, reason?: string) {
  const userToken = await apiLogin(request, 'user');
  const proToken = await apiLogin(request, 'pro');
  const job = await apiCreateJob(request, userToken, uniqueTitle(slug));
  const bid = await apiSubmitBid(request, proToken, job.id);
  await apiAcceptBid(request, userToken, job.id, bid.id);
  await apiSubmitCompletion(request, proToken, job.id);
  await apiDisputeCompletion(request, userToken, job.id, reason);
  return { userToken, proToken, job };
}

test.describe('Admin dispute resolution — UI', () => {
  test.use({ storageState: ADMIN_STORAGE_STATE });

  test('admin sees the dispute and resolves it in the pro\'s favour', async ({ page, request }) => {
    const reason = `E2E dispute reason ${Date.now()}`;
    const { userToken, job } = await stageDisputedJob(request, 'admin resolve', reason);

    // Disputes now live in their own admin view, reachable via the ?view= param.
    await page.goto('/admin-users?view=disputes');
    const card = page.locator('.dispute-card').filter({ hasText: job.title });
    await expect(card).toBeVisible({ timeout: 15_000 });

    // The card shows the parties and the consumer's reason
    await expect(card).toContainText(reason);
    await expect(card).toContainText('E2E User');
    await expect(card).toContainText('E2E Testing Services');

    await card.getByRole('button', { name: /complete for pro/i }).click();

    // A resolution comment is now required before completing.
    await card.locator('textarea').fill('E2E admin resolution: work verified as completed.');
    await card.getByRole('button', { name: /confirm complete/i }).click();

    // Card leaves the open-disputes list once resolved
    await expect(card).toHaveCount(0, { timeout: 15_000 });

    // Backend state: job Completed, completion Verified
    const jobRes = await request.get(`${API_URL}/jobs/${job.id}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect((await jobRes.json()).status).toBe('Completed');
  });

  test('refund resolution asks for confirmation and can be cancelled', async ({ page, request }) => {
    const { job } = await stageDisputedJob(request, 'refund confirm');

    // Disputes now live in their own admin view, reachable via the ?view= param.
    await page.goto('/admin-users?view=disputes');
    const card = page.locator('.dispute-card').filter({ hasText: job.title });
    await expect(card).toBeVisible({ timeout: 15_000 });

    await card.getByRole('button', { name: /refund & reopen/i }).click();

    // Inline confirm form replaces the action buttons
    const confirmForm = card.locator('.refund-confirm-form');
    await expect(confirmForm).toBeVisible();
    await expect(confirmForm).toContainText(/reopen the job for rebidding/i);
    await expect(card.getByRole('button', { name: /complete for pro/i })).toHaveCount(0);

    await confirmForm.getByRole('button', { name: /cancel/i }).click();
    await expect(confirmForm).toBeHidden();
    await expect(card.getByRole('button', { name: /complete for pro/i })).toBeVisible();
  });
});

test.describe('Admin dispute resolution — API rules', () => {
  test('resolution value must be complete or refund', async ({ request }) => {
    const adminToken = await apiLogin(request, 'admin');
    const { job } = await stageDisputedJob(request, 'bad resolution');

    const res = await request.post(`${API_URL}/admin/jobs/${job.id}/completion/resolve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { resolution: 'split-the-difference' },
    });
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain("must be 'complete' or 'refund'");
  });

  test('only Disputed completions can be resolved', async ({ request }) => {
    const adminToken = await apiLogin(request, 'admin');
    const userToken = await apiLogin(request, 'user');
    const proToken = await apiLogin(request, 'pro');

    // Completion submitted but NOT disputed
    const job = await apiCreateJob(request, userToken, uniqueTitle('not disputed'));
    const bid = await apiSubmitBid(request, proToken, job.id);
    await apiAcceptBid(request, userToken, job.id, bid.id);
    await apiSubmitCompletion(request, proToken, job.id);

    const res = await request.post(`${API_URL}/admin/jobs/${job.id}/completion/resolve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { resolution: 'complete', notes: 'resolution comment' },
    });
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain('not in Disputed status');
  });

  test('a resolution comment is required', async ({ request }) => {
    const adminToken = await apiLogin(request, 'admin');
    const { job } = await stageDisputedJob(request, 'no comment');

    const res = await request.post(`${API_URL}/admin/jobs/${job.id}/completion/resolve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { resolution: 'complete' },
    });
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain('resolution comment is required');
  });

  test('refund resolution requires a completed payment', async ({ request }) => {
    const adminToken = await apiLogin(request, 'admin');
    const { job } = await stageDisputedJob(request, 'refund no payment');

    const res = await request.post(`${API_URL}/admin/jobs/${job.id}/completion/resolve`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      data: { resolution: 'refund', notes: 'resolution comment' },
    });
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain('No completed payment found');
  });

  test('non-admins cannot resolve disputes', async ({ request }) => {
    const userToken = await apiLogin(request, 'user');
    const { job } = await stageDisputedJob(request, 'forbidden resolve');

    const res = await request.post(`${API_URL}/admin/jobs/${job.id}/completion/resolve`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { resolution: 'complete' },
    });
    expect(res.status()).toBe(403);
  });

  test('admin-only refund endpoint rejects consumers', async ({ request }) => {
    const userToken = await apiLogin(request, 'user');

    const res = await request.post(`${API_URL}/payments/999999/refund`, {
      headers: { Authorization: `Bearer ${userToken}` },
      data: { reason: 'should not be allowed' },
    });
    expect(res.status()).toBe(403); // role check happens before the 404
  });
});
