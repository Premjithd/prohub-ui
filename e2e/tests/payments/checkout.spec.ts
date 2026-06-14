import { test, expect, Page } from '@playwright/test';
import { PendingJobDetailsPage } from '../../pages/pending-job-details.page';
import { CheckoutDialog } from '../../pages/checkout-dialog.page';
import { PayAmountDialog } from '../../pages/pay-amount-dialog.page';
import {
  API_URL,
  apiAcceptBid,
  apiCreateJob,
  apiCreatePaymentRequest,
  apiLogin,
  apiSubmitBid,
} from '../../fixtures/api';
import { E2E_PRO, USER_STORAGE_STATE } from '../../fixtures/test-users';

/**
 * Payment checkout flow with payment method selection.
 *
 * Two network edges are mocked so the tests are deterministic and need no
 * real Razorpay account:
 *  - POST /payments/create-order (backend would call the Razorpay API)
 *  - the checkout.js script, replaced by a stub that records the options the
 *    app passes to Razorpay — letting us assert the real VPA handoff
 * The checkout-context response is also mocked for the dialog tests so they
 * can't race the settings specs, which clear the same user's saved methods;
 * the real endpoint gets its own API-level test at the bottom.
 */

const uniqueTitle = (slug: string) => `E2E ${slug} ${Date.now()}`;

const ORDER_MOCK = {
  orderId: 'order_e2e_test',
  amount: 2012.4,
  currency: 'INR',
  key: 'rzp_test_e2e',
  principalAmount: 1800, // paying the full agreed bid
  bidAmount: 1800,
  remainingBefore: 1800,
  platformFee: 180,
  gstOnPlatformFee: 32.4,
  proDeduction: 180,
  totalAmount: 2012.4, // bid 1800 + 10% fee + 18% GST on fee
  proPayout: 1620,
  effectivePlatformFeePercent: 10,
  effectiveProPayoutPercent: 90,
};

const CONTEXT_MOCK = {
  paymentMethods: [
    {
      id: 9001, type: 'UPI', label: 'My UPI', isDefault: true,
      upiVpa: 'e2e.checkout@upi', bankAccountHolderName: null,
      bankAccountNumber: null, bankIfsc: null,
      createdAt: new Date().toISOString(), ownerType: 'User',
    },
    {
      id: 9002, type: 'Bank', label: 'Salary Account', isDefault: false,
      upiVpa: null, bankAccountHolderName: 'E2E User',
      bankAccountNumber: '****4321', bankIfsc: 'SBIN0001234',
      createdAt: new Date().toISOString(), ownerType: 'User',
    },
  ],
  billingAddress: {
    id: 1, houseNameNumber: '12A', street1: 'MG Road', street2: null,
    city: 'Thiruvananthapuram', district: 'Thiruvananthapuram',
    state: 'Kerala', country: 'India', zipPostalCode: '695001',
  },
};

const RAZORPAY_STUB = `
  window.Razorpay = function (options) {
    window.__rzpOptions = options;
    this.open = function () { window.__rzpOpened = true; };
  };
`;

async function mockCheckoutRoutes(page: Page, context: object = CONTEXT_MOCK): Promise<void> {
  await page.route('**/payments/create-order', (route) =>
    route.fulfill({ json: ORDER_MOCK }));
  await page.route('**/payment-methods/checkout-context', (route) =>
    route.fulfill({ json: context }));
  await page.route('https://checkout.razorpay.com/**', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: RAZORPAY_STUB }));
}

/**
 * Stages an accepted job where the Pro has requested full payment, then opens
 * the checkout dialog via the tile's "Pay Now" → amount picker → Continue.
 */
async function openCheckout(page: Page, request: any, slug: string): Promise<CheckoutDialog> {
  const userToken = await apiLogin(request, 'user');
  const proToken = await apiLogin(request, 'pro');
  const job = await apiCreateJob(request, userToken, uniqueTitle(slug));
  const bid = await apiSubmitBid(request, proToken, job.id); // default amount 1800
  await apiAcceptBid(request, userToken, job.id, bid.id);
  // Pro requests the full amount so the consumer's "Pay Now" button appears.
  await apiCreatePaymentRequest(request, proToken, job.id, { requestType: 'Full' });

  const details = new PendingJobDetailsPage(page);
  await details.goto(job.id);
  await details.payNowButton.click();

  // Amount picker defaults to the requested/full amount — continue to checkout.
  const payAmount = new PayAmountDialog(page);
  await payAmount.waitForOpen();
  await payAmount.continue();

  const checkout = new CheckoutDialog(page);
  await checkout.waitForOpen();
  return checkout;
}

test.describe('Payment checkout — method selection', () => {
  test.use({ storageState: USER_STORAGE_STATE });

  test('dialog lists saved methods with the default pre-selected and a correct summary', async ({ page, request }) => {
    await mockCheckoutRoutes(page);
    const checkout = await openCheckout(page, request, 'checkout summary');

    // Two saved methods + the "Other method" option
    await expect(checkout.methodRows).toHaveCount(3);
    await expect(checkout.methodRow('My UPI')).toContainText('e2e.checkout@upi');
    await expect(checkout.methodRow('Salary Account')).toContainText('****4321');
    await expect(checkout.otherMethodRow).toBeVisible();

    // Default method pre-selected, with the Default pill
    await checkout.expectSelected('My UPI');
    await expect(checkout.methodRow('My UPI').locator('.rzp-def-pill')).toBeVisible();

    // Selection moves on click
    await checkout.methodRow('Salary Account').click();
    await checkout.expectSelected('Salary Account');
    await expect(checkout.methodRow('My UPI')).not.toHaveClass(/active/);

    // Order summary: bid 1800 + fee 180 + GST 32.40 = 2012.40
    await expect(checkout.dialog).toContainText('₹1800.00');
    await expect(checkout.dialog).toContainText('₹180.00');
    await expect(checkout.dialog).toContainText('₹32.40');
    await expect(checkout.orderTotal).toHaveText('₹2012.40');
    await expect(checkout.payButton).toContainText('Pay ₹2012.40');

    // Billing address from the saved profile address
    await expect(checkout.billingAddress).toContainText('Thiruvananthapuram');
  });

  test('paying with a saved UPI method passes its VPA to Razorpay', async ({ page, request }) => {
    await mockCheckoutRoutes(page);
    const checkout = await openCheckout(page, request, 'checkout upi prefill');

    await checkout.expectSelected('My UPI'); // default
    await checkout.payButton.click();

    await expect.poll(() => page.evaluate(() => (window as any).__rzpOpened)).toBe(true);
    const options = await page.evaluate(() => (window as any).__rzpOptions);
    expect(options.prefill.vpa).toBe('e2e.checkout@upi');
    expect(options.order_id).toBe(ORDER_MOCK.orderId);
    expect(options.amount).toBe(ORDER_MOCK.totalAmount * 100); // paisa
    expect(options.key).toBe(ORDER_MOCK.key);
  });

  test('choosing "Other method" sends no VPA prefill', async ({ page, request }) => {
    await mockCheckoutRoutes(page);
    const checkout = await openCheckout(page, request, 'checkout other method');

    await checkout.otherMethodRow.click();
    await checkout.payButton.click();

    await expect.poll(() => page.evaluate(() => (window as any).__rzpOpened)).toBe(true);
    const options = await page.evaluate(() => (window as any).__rzpOptions);
    expect(options.prefill.vpa).toBeUndefined();
  });

  test('with no saved methods the user can still enter payment manually', async ({ page, request }) => {
    await mockCheckoutRoutes(page, { paymentMethods: [], billingAddress: null });
    const checkout = await openCheckout(page, request, 'checkout no methods');

    // A single "enter payment details" option is shown, pre-selected, and the Pay
    // button is enabled — the user can pay on the fly without saving a method first.
    await expect(checkout.methodRows).toHaveCount(1);
    await expect(checkout.methodRows.first()).toContainText(/enter payment details/i);
    await expect(checkout.methodRows.first()).toHaveClass(/active/);
    await expect(checkout.payButton).toBeEnabled();

    // The notice still offers an optional shortcut to save a method for next time.
    await expect(checkout.noMethodsNotice).toBeVisible();
    await expect(checkout.noMethodsNotice).toContainText(/no saved methods/i);
    await checkout.addMethodLink.click();
    await expect(checkout.dialog).toBeHidden();
    await expect(page).toHaveURL(/\/settings/);
  });
});

// ── Real checkout-context endpoint (no mocks) ─────────────────────────────────

test.describe('Checkout context API', () => {
  test('returns the saved billing address and a methods array', async ({ request }) => {
    const userToken = await apiLogin(request, 'user');

    const res = await request.get(`${API_URL}/payment-methods/checkout-context`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    expect(res.ok(), await res.text()).toBe(true);

    const body = await res.json();
    expect(Array.isArray(body.paymentMethods)).toBe(true);
    // The e2e user's registration address doubles as the billing address
    expect(body.billingAddress?.city).toBe('Thiruvananthapuram');
    expect(body.billingAddress?.zipPostalCode).toBe('695001');
  });

  test('is rejected for pros', async ({ request }) => {
    const proToken = await apiLogin(request, 'pro');

    const res = await request.get(`${API_URL}/payment-methods/checkout-context`, {
      headers: { Authorization: `Bearer ${proToken}` },
    });
    expect(res.status()).toBe(403); // [Authorize(Roles = "User")]
  });
});
