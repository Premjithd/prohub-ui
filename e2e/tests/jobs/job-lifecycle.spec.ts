import { test, expect } from '@playwright/test';
import { PendingJobDetailsPage } from '../../pages/pending-job-details.page';
import { JobDetailsPage } from '../../pages/job-details.page';
import {
  apiAcceptBid,
  apiCreateJob,
  apiCreatePaymentRequest,
  apiLogin,
  apiSetJobPhases,
  apiSubmitBid,
} from '../../fixtures/api';
import { setJobStatus } from '../../fixtures/db';
import { E2E_PRO, PRO_STORAGE_STATE, USER_STORAGE_STATE } from '../../fixtures/test-users';

/**
 * Job lifecycle: post → bid → reject/accept → work updates.
 * Test data is created through the API (per project conventions); the UI is
 * used only for the step each test actually verifies. Every test creates its
 * own uniquely-titled job so runs never interfere with each other.
 */

const uniqueTitle = (slug: string) => `E2E ${slug} ${Date.now()}`;

// ── Consumer side ─────────────────────────────────────────────────────────────

test.describe('Job lifecycle — consumer', () => {
  test.use({ storageState: USER_STORAGE_STATE });

  test('a posted job shows as Open with no bids yet', async ({ page, request }) => {
    const userToken = await apiLogin(request, 'user');
    const job = await apiCreateJob(request, userToken, uniqueTitle('fresh job'));

    const details = new PendingJobDetailsPage(page);
    await details.goto(job.id);

    await expect(page.getByText(job.title)).toBeVisible();
    await expect(details.bidsSection).toBeVisible();
    await expect(details.bidsSection).toContainText(/no bids received yet/i);
  });

  test('a submitted bid appears with amount, message and Pending status', async ({ page, request }) => {
    const userToken = await apiLogin(request, 'user');
    const proToken = await apiLogin(request, 'pro');
    const job = await apiCreateJob(request, userToken, uniqueTitle('bid visibility'));
    await apiSubmitBid(request, proToken, job.id, 1750, 'Bid for visibility test');

    const details = new PendingJobDetailsPage(page);
    await details.goto(job.id);

    const row = details.bidRow(E2E_PRO.businessName);
    await expect(row).toBeVisible();
    await expect(row).toContainText('1,750');
    await expect(row).toContainText('Bid for visibility test');
    await expect(row).toContainText('Pending');
    await expect(row.getByRole('button', { name: /accept/i })).toBeVisible();
    await expect(row.getByRole('button', { name: /reject/i })).toBeVisible();
  });

  test('rejecting a bid marks it Rejected and removes the action buttons', async ({ page, request }) => {
    const userToken = await apiLogin(request, 'user');
    const proToken = await apiLogin(request, 'pro');
    const job = await apiCreateJob(request, userToken, uniqueTitle('reject bid'));
    await apiSubmitBid(request, proToken, job.id);

    const details = new PendingJobDetailsPage(page);
    await details.goto(job.id);
    await details.rejectBid(E2E_PRO.businessName, 'Found someone closer');

    const row = details.bidRow(E2E_PRO.businessName);
    await expect(row).toContainText('Rejected');
    await expect(row.getByRole('button', { name: /accept/i })).toHaveCount(0);
    await expect(row.getByRole('button', { name: /reject/i })).toHaveCount(0);
  });

  test('accepting a bid assigns the pro and offers payment', async ({ page, request }) => {
    const userToken = await apiLogin(request, 'user');
    const proToken = await apiLogin(request, 'pro');
    const job = await apiCreateJob(request, userToken, uniqueTitle('accept bid'));
    const bid = await apiSubmitBid(request, proToken, job.id);

    const details = new PendingJobDetailsPage(page);
    await details.goto(job.id);
    await details.acceptBid(E2E_PRO.businessName);

    // Job is now 'Bid Accepted': assigned-pro section replaces the bids list
    await expect(page.locator('.assigned-pro-section')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.assigned-pro-section')).toContainText(E2E_PRO.businessName);
    await expect(details.bidsSection).toHaveCount(0); // only shown for Open jobs

    // Payment is offered once the pro raises a request — then "Pay Now" appears.
    await expect(details.payNowButton).toHaveCount(0);
    await apiCreatePaymentRequest(request, proToken, job.id, { requestType: 'Full' });
    await page.reload();
    await expect(details.payNowButton).toBeVisible({ timeout: 15_000 });
  });

  test('work updates: phase progress is shown once the job is in progress', async ({ page, request }) => {
    const userToken = await apiLogin(request, 'user');
    const proToken = await apiLogin(request, 'pro');
    const job = await apiCreateJob(request, userToken, uniqueTitle('work updates'));
    const bid = await apiSubmitBid(request, proToken, job.id);
    await apiAcceptBid(request, userToken, job.id, bid.id);

    // 'In Progress' normally requires a real Razorpay payment — stage it in DB
    setJobStatus(job.id, 'In Progress');

    // Pro defines three phases; the first is already done (a work update)
    await apiSetJobPhases(request, proToken, job.id, [
      { id: 'p1', title: 'Site inspection', isCompleted: true, completedAt: new Date().toISOString() },
      { id: 'p2', title: 'Materials purchase', isCompleted: false },
      { id: 'p3', title: 'Installation', isCompleted: false },
    ]);

    const details = new PendingJobDetailsPage(page);
    await details.goto(job.id);

    await expect(details.progressSection).toBeVisible({ timeout: 15_000 });
    await expect(details.phaseMilestones).toHaveCount(3);
    await expect(details.progressPercentage).toContainText('33');
    await expect(details.phaseMilestones.filter({ hasText: 'Site inspection' })
      .locator('.milestone-marker.completed')).toBeVisible();
    await expect(details.phaseMilestones.filter({ hasText: 'Installation' })
      .locator('.milestone-marker.completed')).toHaveCount(0);
  });
});

// ── Pro side ──────────────────────────────────────────────────────────────────

test.describe('Job lifecycle — pro', () => {
  test.use({ storageState: PRO_STORAGE_STATE });

  test('an open job is visible in Available Jobs', async ({ page, request }) => {
    const userToken = await apiLogin(request, 'user');
    const job = await apiCreateJob(request, userToken, uniqueTitle('available listing'));

    await page.goto('/available-jobs');
    // The search box lives in the collapsible Filters panel — expand if needed
    // (checked via aria-expanded; visibility checks race the panel animation)
    const filtersHeader = page.locator('mat-expansion-panel-header');
    await filtersHeader.waitFor({ state: 'visible' });
    if ((await filtersHeader.getAttribute('aria-expanded')) !== 'true') {
      await filtersHeader.click();
    }
    // Filter by the unique title so pagination can't hide the job
    await page.locator('.search-field input').fill(job.title);
    await expect(page.locator(`#job-card-${job.id}`)).toBeVisible({ timeout: 15_000 });
  });

  test('pro submits a bid through the UI', async ({ page, request }) => {
    const userToken = await apiLogin(request, 'user');
    const job = await apiCreateJob(request, userToken, uniqueTitle('ui bid'));

    const jobDetails = new JobDetailsPage(page);
    await jobDetails.goto(job.id);
    await jobDetails.submitBid(2200, 'E2E UI bid — available next week.');

    // The action button flips to a disabled "Already Bid on This Job"
    await expect(jobDetails.alreadyBidButton).toBeVisible({ timeout: 15_000 });
    await expect(jobDetails.alreadyBidButton).toBeDisabled();
  });

  test('pro cannot bid twice on the same job', async ({ page, request }) => {
    const userToken = await apiLogin(request, 'user');
    const proToken = await apiLogin(request, 'pro');
    const job = await apiCreateJob(request, userToken, uniqueTitle('double bid'));
    await apiSubmitBid(request, proToken, job.id);

    const jobDetails = new JobDetailsPage(page);
    await jobDetails.goto(job.id);

    await expect(jobDetails.alreadyBidButton).toBeVisible();
    await expect(jobDetails.alreadyBidButton).toBeDisabled();
    await expect(jobDetails.sendBidButton).toHaveCount(0);
  });
});
