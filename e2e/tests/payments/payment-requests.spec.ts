import { test, expect } from '@playwright/test';
import {
  API_URL,
  apiAcceptBid,
  apiCreateJob,
  apiCreatePaymentRequest,
  apiGetPaymentSummary,
  apiLogin,
  apiLoginWithId,
  apiSubmitBid,
} from '../../fixtures/api';
import { stagePendingPayment } from '../../fixtures/db';

/**
 * End-to-end coverage for Pro-driven payment requests and partial-payment
 * tracking, exercised directly against the running backend + LocalDB.
 *
 * The Razorpay gateway is never called: create-order is only used here for its
 * validation paths (which run before any gateway call), so no test keys needed.
 */

const uniqueTitle = (slug: string) => `E2E ${slug} ${Date.now()}`;
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Posts a job, has the pro bid, and the user accept → job 'Bid Accepted', pro assigned. */
async function stageAcceptedJob(request: any, slug: string, amount = 1800) {
  const userToken = await apiLogin(request, 'user');
  const proToken = await apiLogin(request, 'pro');
  const job = await apiCreateJob(request, userToken, uniqueTitle(slug));
  const bid = await apiSubmitBid(request, proToken, job.id, amount);
  await apiAcceptBid(request, userToken, job.id, bid.id);
  return { job, bid, userToken, proToken };
}

test.describe('Payment requests & tracking (API)', () => {
  test('summary is empty right after acceptance', async ({ request }) => {
    const { job, userToken } = await stageAcceptedJob(request, 'summary-empty');

    const summary = await apiGetPaymentSummary(request, userToken, job.id);
    expect(summary.bidAmount).toBe(1800);
    expect(summary.totalPaidPrincipal).toBe(0);
    expect(summary.remaining).toBe(1800);
    expect(summary.isFullyPaid).toBe(false);
    expect(summary.payments).toHaveLength(0);
    expect(summary.activeRequest ?? null).toBeNull();
  });

  test('Pro requests Full → active request for the full remaining', async ({ request }) => {
    const { job, proToken, userToken } = await stageAcceptedJob(request, 'request-full');

    const afterRequest = await apiCreatePaymentRequest(request, proToken, job.id, { requestType: 'Full' });
    expect(afterRequest.activeRequest?.requestType).toBe('Full');
    expect(afterRequest.activeRequest?.requestedAmount).toBe(1800);
    expect(afterRequest.activeRequest?.status).toBe('Pending');

    // Visible to the consumer too
    const consumerView = await apiGetPaymentSummary(request, userToken, job.id);
    expect(consumerView.activeRequest?.requestType).toBe('Full');
  });

  test('Pro requests Partial with a 50% floor → minAmount is computed', async ({ request }) => {
    const { job, proToken } = await stageAcceptedJob(request, 'request-partial');

    const summary = await apiCreatePaymentRequest(request, proToken, job.id, {
      requestType: 'Partial',
      requestedAmount: 1000,
      minPercent: 50,
    });
    expect(summary.activeRequest?.requestType).toBe('Partial');
    expect(summary.activeRequest?.requestedAmount).toBe(1000);
    expect(summary.activeRequest?.minAmount).toBe(500); // 50% of 1000
  });

  test('Pro requests No payment → job advances to Payment Made, request fulfilled', async ({ request }) => {
    const { job, proToken, userToken } = await stageAcceptedJob(request, 'request-none');

    const summary = await apiCreatePaymentRequest(request, proToken, job.id, { requestType: 'None' });
    // A fulfilled "None" request is not an active (Pending) request.
    expect(summary.activeRequest ?? null).toBeNull();
    expect(summary.remaining).toBe(1800);

    const jobRes = await request.get(`${API_URL}/jobs/${job.id}`, { headers: auth(userToken) });
    expect(jobRes.ok()).toBe(true);
    expect((await jobRes.json()).status).toBe('Payment Made');
  });

  test('only one active request at a time', async ({ request }) => {
    const { job, proToken } = await stageAcceptedJob(request, 'one-active');

    await apiCreatePaymentRequest(request, proToken, job.id, { requestType: 'Full' });

    const second = await request.post(`${API_URL}/payments/request`, {
      headers: auth(proToken),
      data: { jobId: job.id, requestType: 'Partial', requestedAmount: 500, minPercent: 0 },
    });
    expect(second.status()).toBe(400);
    expect(await second.text()).toMatch(/already an active payment request/i);
  });

  test('a partial request cannot exceed the remaining balance', async ({ request }) => {
    const { job, proToken } = await stageAcceptedJob(request, 'partial-over');

    const res = await request.post(`${API_URL}/payments/request`, {
      headers: auth(proToken),
      data: { jobId: job.id, requestType: 'Partial', requestedAmount: 5000, minPercent: 0 },
    });
    expect(res.status()).toBe(400);
    expect(await res.text()).toMatch(/exceeds the remaining balance/i);
  });

  test('a non-assigned user cannot raise a request', async ({ request }) => {
    const { job, userToken } = await stageAcceptedJob(request, 'request-forbidden');

    // The job owner (consumer) is not the assigned pro → forbidden.
    const res = await request.post(`${API_URL}/payments/request`, {
      headers: auth(userToken),
      data: { jobId: job.id, requestType: 'Full' },
    });
    expect(res.status()).toBe(403);
  });

  test('create-order enforces the request floor and the remaining balance', async ({ request }) => {
    const { job, bid, proToken, userToken } = await stageAcceptedJob(request, 'create-order-bounds');
    // Floor = 50% of 1000 = 500.
    await apiCreatePaymentRequest(request, proToken, job.id, {
      requestType: 'Partial',
      requestedAmount: 1000,
      minPercent: 50,
    });

    // Below the floor → rejected (validation runs before any gateway call).
    const belowFloor = await request.post(`${API_URL}/payments/create-order`, {
      headers: auth(userToken),
      data: { jobId: job.id, bidId: bid.id, amount: 1800, principalAmount: 200 },
    });
    expect(belowFloor.status()).toBe(400);
    expect(await belowFloor.text()).toMatch(/minimum payment/i);

    // Above the remaining balance → rejected.
    const overRemaining = await request.post(`${API_URL}/payments/create-order`, {
      headers: auth(userToken),
      data: { jobId: job.id, bidId: bid.id, amount: 1800, principalAmount: 5000 },
    });
    expect(overRemaining.status()).toBe(400);
    expect(await overRemaining.text()).toMatch(/exceeds the remaining balance/i);
  });
});

/**
 * Full partial-payment journey, driven through the real gateway-capture path:
 * each payment is staged Pending (as create-order would) and completed by a
 * payment.captured webhook (Dev WebhookSecret is empty, so no signature needed).
 * Verifies the payment summary keeps paid/remaining/fully-paid in sync — the
 * "payment details not updating" report.
 */
test.describe('Partial payment journey (gateway capture → summary)', () => {
  const jobStatus = async (request: any, token: string, jobId: number) =>
    (await (await request.get(`${API_URL}/jobs/${jobId}`, { headers: auth(token) })).json()).status;

  async function captureOrder(request: any, orderId: string): Promise<void> {
    const res = await request.post(`${API_URL}/payments/webhook`, {
      data: { event: 'payment.captured', payload: { payment: { entity: { id: `pay_${orderId}`, order_id: orderId } } } },
    });
    expect(res.ok(), `webhook capture failed: ${await res.text()}`).toBe(true);
  }

  test('two partials accrue to fully paid, in sync for both user and pro', async ({ request }) => {
    const { id: userId } = await apiLoginWithId(request, 'user');
    const { job, bid, userToken, proToken } = await stageAcceptedJob(request, 'partial-journey'); // bid 1800

    // ── Partial #1: pro requests ₹1000 (50% floor); consumer pays ₹1000 ──
    await apiCreatePaymentRequest(request, proToken, job.id, { requestType: 'Partial', requestedAmount: 1000, minPercent: 50 });
    const order1 = `order_e2e_${job.id}_a`;
    stagePendingPayment({ jobId: job.id, bidId: bid.id, userId, principal: 1000, orderId: order1 });
    await captureOrder(request, order1);

    let s = await apiGetPaymentSummary(request, userToken, job.id);
    expect(s.totalPaidPrincipal).toBe(1000);
    expect(s.remaining).toBe(800);
    expect(s.isFullyPaid).toBe(false);
    expect(s.activeRequest ?? null).toBeNull();                    // request fulfilled by the payment
    expect(s.payments.filter((p) => p.status === 'Completed')).toHaveLength(1);
    expect(await jobStatus(request, userToken, job.id)).toBe('Payment Made');

    // ── Partial #2: pro requests the remaining (Full = ₹800); consumer pays it ──
    await apiCreatePaymentRequest(request, proToken, job.id, { requestType: 'Full' });
    const order2 = `order_e2e_${job.id}_b`;
    stagePendingPayment({ jobId: job.id, bidId: bid.id, userId, principal: 800, orderId: order2 });
    await captureOrder(request, order2);

    s = await apiGetPaymentSummary(request, userToken, job.id);
    expect(s.totalPaidPrincipal).toBe(1800);
    expect(s.remaining).toBe(0);
    expect(s.isFullyPaid).toBe(true);
    expect(s.activeRequest ?? null).toBeNull();
    expect(s.payments.filter((p) => p.status === 'Completed')).toHaveLength(2);

    // The pro sees exactly the same up-to-date figures.
    const proView = await apiGetPaymentSummary(request, proToken, job.id);
    expect(proView.totalPaidPrincipal).toBe(1800);
    expect(proView.remaining).toBe(0);
    expect(proView.isFullyPaid).toBe(true);
  });
});

/**
 * The real POST /payments/create-order path. Works against either gateway:
 *  - real Razorpay (UseMockProvider=false): asserts a genuine order is created (no 400).
 *  - mock (UseMockProvider=true): also completes verify → summary shows fully paid.
 */
test.describe('Create order + verify', () => {
  test('create-order succeeds (no 400); mock gateway also completes the payment', async ({ request }) => {
    const { job, bid, userToken, proToken } = await stageAcceptedJob(request, 'create-order');
    await apiCreatePaymentRequest(request, proToken, job.id, { requestType: 'Full' });

    const orderRes = await request.post(`${API_URL}/payments/create-order`, {
      headers: auth(userToken),
      data: { jobId: job.id, bidId: bid.id, amount: 1800, principalAmount: 1800 },
    });
    expect(orderRes.ok(), `create-order failed: ${await orderRes.text()}`).toBe(true);
    const order = await orderRes.json();
    expect(order.orderId).toMatch(/^order_/);          // genuine Razorpay or mock — both "order_*"
    expect(order.principalAmount).toBe(1800);
    expect(order.totalAmount).toBeGreaterThan(1800);   // bid + platform fee + GST

    // verify is deterministic only with the mock gateway (real Razorpay needs a
    // gateway-signed signature), so complete the payment only in mock mode.
    test.skip(order.key !== 'rzp_test_mock', 'Live Razorpay gateway — skipping mock verify path');

    const verifyRes = await request.post(`${API_URL}/payments/verify`, {
      headers: auth(userToken),
      data: { razorpayOrderId: order.orderId, razorpayPaymentId: 'pay_mock_1', razorpaySignature: 'mock_sig' },
    });
    expect(verifyRes.ok(), `verify failed: ${await verifyRes.text()}`).toBe(true);

    const s = await apiGetPaymentSummary(request, userToken, job.id);
    expect(s.totalPaidPrincipal).toBe(1800);
    expect(s.remaining).toBe(0);
    expect(s.isFullyPaid).toBe(true);
  });
});
