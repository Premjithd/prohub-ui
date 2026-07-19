import { Component, Inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { PaymentService } from '../../services/payment.service';
import { PaymentMethodService, CheckoutContext } from '../../core/services/payment-method.service';
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

  billingAddress: CheckoutContext['billingAddress'] | null = null;

  constructor(
    private paymentService: PaymentService,
    private pmService: PaymentMethodService,
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
    this.pmService.getCheckoutContext()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (ctx) => {
          this.billingAddress = ctx.billingAddress;
          this.cdr.markForCheck();
        },
        error: () => {
          // Pro role or API error — no billing address to show
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
      const vpa = this.data.prefillVpa;
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

  formatAddress(addr: CheckoutContext['billingAddress']): string {
    if (!addr) return '';
    return [addr.houseNameNumber, addr.street1, addr.street2, addr.city, addr.state, addr.zipPostalCode]
      .filter(Boolean).join(', ');
  }

  onCancel(): void {
    if (!this.processing) this.dialogRef.close();
  }
}
