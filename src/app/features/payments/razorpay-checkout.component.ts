import { Component, Inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { PaymentService } from '../../services/payment.service';
import { PaymentMethodService, PaymentMethod, CheckoutContext } from '../../core/services/payment-method.service';
import { CreatePaymentRequest } from '../../models/payment.model';
import { getHttpErrorMessage } from '../../core/utils/http-error';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

declare var window: any;

export interface RazorpayCheckoutData {
  jobId: number;
  bidId: number;
  bidAmount: number;            // full agreed bid amount (context)
  principalAmount?: number;     // portion to pay now; omitted = full remaining
  jobTitle: string;
  consumerName: string;
  consumerEmail: string;
  consumerPhone: string;
  prefillVpa?: string; // optional backward compat — overridden by picker selection
}

@Component({
  selector: 'app-razorpay-checkout',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="rzp-wrap">

      <!-- Header -->
      <div class="rzp-head">
        <div class="rzp-head-icon">
          <mat-icon>lock</mat-icon>
        </div>
        <div class="rzp-head-text">
          <h2>Complete Payment</h2>
          <p>{{ data.jobTitle }}</p>
        </div>
        <button mat-icon-button class="rzp-close" (click)="onCancel()" [disabled]="processing">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Full-screen loader while order is fetching -->
      <div class="rzp-init-loading" *ngIf="processing && !rateSplit && !errorMessage">
        <mat-spinner diameter="34"></mat-spinner>
        <p>Preparing checkout...</p>
      </div>

      <ng-container *ngIf="rateSplit || errorMessage">
        <div class="rzp-body">

          <!-- ── Payment Method Picker ──────────────────────────────── -->
          <div class="rzp-section">
            <div class="rzp-section-header">
              <mat-icon>account_balance_wallet</mat-icon>
              <span>Payment Method</span>
            </div>

            <div class="rzp-context-loading" *ngIf="loadingContext">
              <mat-spinner diameter="16"></mat-spinner>
              <span>Loading saved methods...</span>
            </div>

            <ng-container *ngIf="!loadingContext">
              <!-- Saved methods + an always-available "enter a new method" option -->
              <div class="rzp-method-list">
                <div
                  class="rzp-method-row"
                  *ngFor="let m of checkoutMethods"
                  [class.active]="selectedMethodId === m.id"
                  (click)="selectedMethodId = m.id">
                  <mat-icon class="rzp-radio">{{ selectedMethodId === m.id ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>
                  <div class="rzp-method-badge" [class.upi]="m.type === 'UPI'" [class.bank]="m.type === 'Bank'">
                    <mat-icon>{{ m.type === 'UPI' ? 'qr_code_2' : 'account_balance' }}</mat-icon>
                  </div>
                  <div class="rzp-method-text">
                    <div class="rzp-method-name">
                      {{ m.label || (m.type === 'UPI' ? 'UPI' : 'Bank Account') }}
                      <span *ngIf="m.isDefault" class="rzp-def-pill">Default</span>
                    </div>
                    <div class="rzp-method-detail">
                      {{ m.type === 'UPI' ? m.upiVpa : ((m.bankAccountHolderName ? m.bankAccountHolderName + ' · ' : '') + m.bankAccountNumber) }}
                    </div>
                  </div>
                </div>

                <!-- "Other method" option -->
                <div
                  class="rzp-method-row"
                  [class.active]="selectedMethodId === null"
                  (click)="selectedMethodId = null">
                  <mat-icon class="rzp-radio">{{ selectedMethodId === null ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>
                  <div class="rzp-method-badge other">
                    <mat-icon>add_card</mat-icon>
                  </div>
                  <div class="rzp-method-text">
                    <div class="rzp-method-name">{{ checkoutMethods.length > 0 ? 'Other method' : 'Enter payment details' }}</div>
                    <div class="rzp-method-detail">Card, UPI, net banking, wallet &amp; more</div>
                  </div>
                </div>
              </div>

              <!-- Hint when nothing is saved — paying still works via the option above -->
              <div class="rzp-no-methods" *ngIf="checkoutMethods.length === 0">
                <mat-icon>info_outline</mat-icon>
                <span>No saved methods — continue to enter your card / UPI details on the next step.</span>
                <a class="rzp-add-link" (click)="goToSettings()">Save a method</a>
              </div>
            </ng-container>
          </div>

          <!-- ── Order Summary ──────────────────────────────────────── -->
          <div class="rzp-section" *ngIf="rateSplit">
            <div class="rzp-section-header">
              <mat-icon>receipt_long</mat-icon>
              <span>Order Summary</span>
            </div>
            <div class="rzp-breakdown">
              <div class="rzp-bd-row">
                <span>{{ isPartial ? 'This payment' : 'Service charge' }}</span>
                <span>₹{{ rateSplit.bidAmount.toFixed(2) }}</span>
              </div>
              <div class="rzp-bd-row" *ngIf="isPartial">
                <span>Agreed total</span>
                <span>₹{{ fullBidAmount.toFixed(2) }}</span>
              </div>
              <div class="rzp-bd-row">
                <span>Platform fee ({{ rateSplit.platformFeePercent }}%)</span>
                <span>₹{{ rateSplit.platformFee.toFixed(2) }}</span>
              </div>
              <div class="rzp-bd-row">
                <span>GST on platform fee</span>
                <span>₹{{ rateSplit.gstOnPlatformFee.toFixed(2) }}</span>
              </div>
              <div class="rzp-bd-total">
                <span>Total</span>
                <span class="rzp-total-val">₹{{ totalAmount.toFixed(2) }}</span>
              </div>
            </div>
          </div>

          <!-- ── Billing Address ────────────────────────────────────── -->
          <div class="rzp-section rzp-addr-section" *ngIf="billingAddress">
            <div class="rzp-section-header">
              <mat-icon>location_on</mat-icon>
              <span>Billing Address</span>
            </div>
            <p class="rzp-addr-text">{{ formatAddress(billingAddress) }}</p>
          </div>

          <!-- Error -->
          <div class="rzp-error" *ngIf="errorMessage">
            <mat-icon>error_outline</mat-icon> {{ errorMessage }}
          </div>

        </div>

        <!-- Footer -->
        <div class="rzp-footer">
          <button mat-button (click)="onCancel()" [disabled]="processing" class="rzp-cancel-btn">Cancel</button>
          <button
            class="rzp-pay-btn"
            (click)="initiatePayment()"
            [disabled]="processing || !!errorMessage || !rateSplit">
            <mat-spinner *ngIf="processing" diameter="16"></mat-spinner>
            <mat-icon *ngIf="!processing">lock</mat-icon>
            {{ processing ? 'Processing...' : ('Pay ₹' + (rateSplit ? totalAmount.toFixed(2) : '')) }}
          </button>
        </div>
      </ng-container>

    </div>
  `,
  styles: [`
    .rzp-wrap {
      width: 100%;
      min-width: 360px;
      max-width: 520px;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
    }

    .rzp-head {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1.2rem 1.5rem;
      border-bottom: 1px solid #eaecf5;
    }

    .rzp-head-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon { color: white; font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
    }

    .rzp-head-text {
      flex: 1;
      min-width: 0;
      h2 { margin: 0 0 0.1rem; font-size: 1.05rem; font-weight: 700; color: #1a1a2e; }
      p { margin: 0; font-size: 0.82rem; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    }

    .rzp-close { flex-shrink: 0; color: #aaa; }

    .rzp-init-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 3rem 2rem;
      p { margin: 0; color: #888; font-size: 0.9rem; }
    }

    .rzp-body {
      flex: 1;
      overflow-y: auto;
      padding: 1rem 1.5rem 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .rzp-section {
      background: #fafbff;
      border: 1px solid #eaecf5;
      border-radius: 12px;
      padding: 0.9rem 1rem;
    }

    .rzp-section-header {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      margin-bottom: 0.85rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; color: #667eea; }
    }

    .rzp-context-loading {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #aaa;
      font-size: 0.84rem;
    }

    .rzp-method-list {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .rzp-method-row {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.65rem 0.75rem;
      border: 1.5px solid #e8eaf5;
      border-radius: 10px;
      cursor: pointer;
      background: white;
      transition: border-color 0.15s, background 0.15s;

      &.active {
        border-color: #667eea;
        background: #f5f3ff;
      }

      &:hover:not(.active) {
        border-color: #c5cbf5;
      }
    }

    .rzp-radio {
      font-size: 1.1rem;
      width: 1.1rem;
      height: 1.1rem;
      color: #ccc;
      flex-shrink: 0;
    }

    .rzp-method-row.active .rzp-radio { color: #667eea; }

    .rzp-method-badge {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }

      &.upi  { background: #e3f2fd; mat-icon { color: #1565c0; } }
      &.bank { background: #e8f5e9; mat-icon { color: #2e7d32; } }
      &.other { background: #f3f0ff; mat-icon { color: #7c3aed; } }
    }

    .rzp-method-text { flex: 1; min-width: 0; }

    .rzp-method-name {
      font-size: 0.87rem;
      font-weight: 600;
      color: #222;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .rzp-def-pill {
      font-size: 0.68rem;
      font-weight: 700;
      background: #fff8e1;
      color: #f57f17;
      border-radius: 20px;
      padding: 0.05rem 0.45rem;
    }

    .rzp-method-detail {
      font-size: 0.79rem;
      color: #999;
      margin-top: 0.1rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rzp-no-methods {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #aaa;
      font-size: 0.84rem;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; color: #ccc; }
    }

    .rzp-add-link {
      margin-left: auto;
      font-size: 0.82rem;
      color: #667eea;
      font-weight: 600;
      text-decoration: none;
      &:hover { text-decoration: underline; }
    }

    .rzp-breakdown { display: flex; flex-direction: column; }

    .rzp-bd-row {
      display: flex;
      justify-content: space-between;
      padding: 0.38rem 0;
      font-size: 0.87rem;
      color: #666;
      border-bottom: 1px solid #f0f0f8;
      &:last-child { border-bottom: none; }
    }

    .rzp-bd-total {
      display: flex;
      justify-content: space-between;
      padding: 0.6rem 0 0.1rem;
      border-top: 2px solid #eaecf5;
      margin-top: 0.2rem;
      font-size: 0.95rem;
      font-weight: 700;
      color: #222;
    }

    .rzp-total-val { color: #2e7d32; font-size: 1.1rem; }

    .rzp-addr-text { margin: 0; font-size: 0.85rem; color: #555; line-height: 1.5; }

    .rzp-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.7rem 0.9rem;
      background: #fff0f0;
      border: 1px solid #ffcdd2;
      border-radius: 8px;
      color: #c62828;
      font-size: 0.87rem;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    }

    .rzp-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid #eaecf5;
      background: white;
    }

    .rzp-cancel-btn { color: #888; }

    .rzp-pay-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.65rem 1.6rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.15s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover:not(:disabled) { opacity: 0.91; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
  `]
})
export class RazorpayCheckoutComponent implements OnInit, OnDestroy {
  // Order state
  processing = false;
  errorMessage = '';
  rateSplit: any;
  isPartial = false;
  fullBidAmount = 0;
  scriptLoaded = false;
  private orderData: any = null;
  private destroy$ = new Subject<void>();

  // Payment method picker
  checkoutMethods: PaymentMethod[] = [];
  selectedMethodId: number | null = null;
  billingAddress: CheckoutContext['billingAddress'] | null = null;
  loadingContext = false;

  constructor(
    private paymentService: PaymentService,
    private pmService: PaymentMethodService,
    private router: Router,
    public dialogRef: MatDialogRef<RazorpayCheckoutComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RazorpayCheckoutData,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.loadRazorpayScript();
  }

  ngOnInit(): void {
    this.fetchPaymentOrder();
    this.loadCheckoutContext();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get selectedVpa(): string | undefined {
    if (this.selectedMethodId === null) return this.data.prefillVpa;
    const method = this.checkoutMethods.find(m => m.id === this.selectedMethodId);
    return method?.type === 'UPI' ? (method.upiVpa ?? undefined) : undefined;
  }

  get totalAmount(): number {
    if (!this.rateSplit) return 0;
    return this.rateSplit.bidAmount + this.rateSplit.platformFee + this.rateSplit.gstOnPlatformFee;
  }

  private loadRazorpayScript(): void {
    if (window.Razorpay) { this.scriptLoaded = true; return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => { this.scriptLoaded = true; };
    script.onerror = () => { this.errorMessage = 'Failed to load payment gateway. Please try again.'; this.cdr.markForCheck(); };
    document.head.appendChild(script);
  }

  private fetchPaymentOrder(): void {
    this.processing = true;
    this.errorMessage = '';
    const request: CreatePaymentRequest = {
      jobId: this.data.jobId,
      bidId: this.data.bidId,
      amount: this.data.bidAmount,
      principalAmount: this.data.principalAmount
    };
    this.paymentService.createPaymentOrder(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (order) => {
          this.orderData = order;
          this.rateSplit = {
            bidAmount: order.principalAmount,
            platformFeePercent: 10,
            platformFee: order.platformFee,
            gstPercent: 18,
            gstOnPlatformFee: order.gstOnPlatformFee,
            proPayOut: order.proPayout
          };
          this.isPartial = order.principalAmount + 0.01 < order.bidAmount;
          this.fullBidAmount = order.bidAmount;
          this.processing = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.errorMessage = getHttpErrorMessage(error, 'Failed to initialize payment. Please try again.');
          this.processing = false;
          this.cdr.markForCheck();
        }
      });
  }

  private loadCheckoutContext(): void {
    this.loadingContext = true;
    this.pmService.getCheckoutContext()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ctx) => {
          this.checkoutMethods = ctx.paymentMethods;
          this.billingAddress = ctx.billingAddress;
          // Auto-select: prefer default, then first UPI, then first method
          const def = ctx.paymentMethods.find(m => m.isDefault);
          const firstUpi = ctx.paymentMethods.find(m => m.type === 'UPI');
          const autoSelect = def ?? firstUpi ?? ctx.paymentMethods[0];
          this.selectedMethodId = autoSelect?.id ?? null;
          this.loadingContext = false;
          this.cdr.markForCheck();
        },
        error: () => {
          // Pro role or API error — no saved methods
          this.loadingContext = false;
          this.cdr.markForCheck();
        }
      });
  }

  initiatePayment(): void {
    if (!this.orderData) {
      this.errorMessage = 'Payment order data not available. Please try again.';
      this.cdr.markForCheck();
      return;
    }

    // Development mock gateway — skip the real Razorpay widget and complete directly.
    if (this.orderData.key === 'rzp_test_mock') {
      this.processing = true;
      this.errorMessage = '';
      this.cdr.markForCheck();
      this.verifyPayment({
        razorpay_order_id: this.orderData.orderId,
        razorpay_payment_id: 'pay_mock_' + Date.now(),
        razorpay_signature: 'mock_signature'
      });
      return;
    }

    if (!this.scriptLoaded || !window.Razorpay) {
      this.errorMessage = 'Payment gateway not loaded. Please refresh and try again.';
      this.cdr.markForCheck();
      return;
    }

    this.processing = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    try {
      const vpa = this.selectedVpa;
      const options = {
        key: this.orderData.key,
        amount: this.orderData.totalAmount * 100,
        currency: this.orderData.currency,
        order_id: this.orderData.orderId,
        name: 'yProHub',
        description: `Payment for: ${this.data.jobTitle}`,
        customer_notify: 1,
        prefill: {
          name: this.data.consumerName,
          email: this.data.consumerEmail,
          contact: this.data.consumerPhone.replace(/\D/g, ''),
          ...(vpa ? { vpa } : {})
        },
        theme: { color: '#667eea' },
        handler: (response: any) => { this.verifyPayment(response); },
        modal: {
          ondismiss: () => {
            this.processing = false;
            this.cdr.markForCheck();
            this.snackBar.open('Payment cancelled', 'Close', { duration: 3000 });
          }
        }
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.open();
      this.processing = false;
      this.cdr.markForCheck();
    } catch (err) {
      this.processing = false;
      this.errorMessage = 'Failed to open payment gateway. Please try again.';
      this.cdr.markForCheck();
    }
  }

  private verifyPayment(response: any): void {
    this.processing = true;
    this.cdr.markForCheck();

    this.paymentService.verifyPayment({
      razorpayOrderId: response.razorpay_order_id,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.processing = false;
          this.cdr.markForCheck();
          this.snackBar.open('Payment successful! Job activated.', 'Close', { duration: 5000 });
          this.dialogRef.close({ success: true, paymentId: result.paymentId, jobStatus: result.jobStatus });
        },
        error: () => {
          this.processing = false;
          this.errorMessage = 'Payment verification failed. Please contact support.';
          this.cdr.markForCheck();
        }
      });
  }

  goToSettings(): void {
    this.dialogRef.close();
    this.router.navigate(['/settings']);
  }

  formatAddress(addr: CheckoutContext['billingAddress']): string {
    if (!addr) return '';
    return [addr.houseNameNumber, addr.street1, addr.street2, addr.city, addr.state, addr.zipPostalCode]
      .filter(Boolean).join(', ');
  }

  onCancel(): void {
    if (!this.processing) this.dialogRef.close();
  }
}
