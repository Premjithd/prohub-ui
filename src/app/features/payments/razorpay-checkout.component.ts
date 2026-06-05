import { Component, Inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { PaymentService } from '../../services/payment.service';
import { CreatePaymentRequest } from '../../models/payment.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

declare var window: any;

export interface RazorpayCheckoutData {
  jobId: number;
  bidId: number;
  bidAmount: number;
  jobTitle: string;
  consumerName: string;
  consumerEmail: string;
  consumerPhone: string;
  prefillVpa?: string;
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
    <div class="razorpay-dialog-container">
      <div class="dialog-header">
        <h2>Payment Checkout</h2>
        <button mat-icon-button (click)="onCancel()" class="close-btn" [disabled]="processing">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-content">
        <div class="job-summary">
          <h3>{{ data.jobTitle }}</h3>
          <p>Bid Amount: <strong>₹{{ data.bidAmount.toFixed(2) }}</strong></p>
          <p>For: <strong>{{ data.consumerName }}</strong></p>
        </div>

        <div class="rate-breakdown" *ngIf="rateSplit">
          <h4>Payment Breakdown</h4>
          <div class="breakdown-item">
            <span>Bid Amount:</span>
            <strong>₹{{ rateSplit.bidAmount.toFixed(2) }}</strong>
          </div>
          <div class="breakdown-item">
            <span>Platform Fee ({{ rateSplit.platformFeePercent }}%):</span>
            <strong>₹{{ rateSplit.platformFee.toFixed(2) }}</strong>
          </div>
          <div class="breakdown-item">
            <span>GST on Fee ({{ rateSplit.gstPercent }}%):</span>
            <strong>₹{{ rateSplit.gstOnPlatformFee.toFixed(2) }}</strong>
          </div>
          <div class="breakdown-item total">
            <span>Total Amount to Pay:</span>
            <strong>₹{{ (rateSplit.bidAmount + rateSplit.platformFee + rateSplit.gstOnPlatformFee).toFixed(2) }}</strong>
          </div>
        </div>

        <div *ngIf="errorMessage" class="error-message">
          <mat-icon>error</mat-icon>
          <span>{{ errorMessage }}</span>
        </div>

        <div *ngIf="processing" class="processing">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Initializing payment...</p>
        </div>
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="onCancel()" [disabled]="processing">
          Cancel
        </button>
        <button
          mat-raised-button
          color="primary"
          (click)="initiatePayment()"
          [disabled]="processing || !!errorMessage"
        >
          <mat-icon>payment</mat-icon>
          Pay Now <span *ngIf="rateSplit">(₹{{ (rateSplit.bidAmount + rateSplit.platformFee + rateSplit.gstOnPlatformFee).toFixed(2) }})</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .razorpay-dialog-container {
      width: 100%;
      display: flex;
      flex-direction: column;
      min-width: 400px;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 1.5rem 1rem 1.5rem;
      border-bottom: 1px solid #e0e0e0;
      margin-bottom: 1.5rem;

      h2 {
        margin: 0;
        font-size: 1.5rem;
        color: #333;
      }

      .close-btn {
        margin: -0.5rem;
      }
    }

    .dialog-content {
      padding: 0 1.5rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;

      .job-summary {
        padding: 1rem;
        background-color: #f5f5f5;
        border-radius: 4px;

        h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
          color: #333;
        }

        p {
          margin: 0.25rem 0;
          color: #666;
          font-size: 0.95rem;

          strong {
            color: #333;
            font-weight: 600;
          }
        }
      }

      .rate-breakdown {
        padding: 1rem;
        background-color: #fafafa;
        border: 1px solid #e8e8e8;
        border-radius: 4px;

        h4 {
          margin: 0 0 1rem 0;
          font-size: 0.95rem;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .breakdown-item {
          display: flex;
          justify-content: space-between;
          padding: 0.5rem 0;
          font-size: 0.9rem;
          color: #666;
          border-bottom: 1px solid #e8e8e8;

          &:last-child {
            border-bottom: none;
          }

          strong {
            color: #333;
            font-weight: 600;
          }

          &.total {
            padding-top: 1rem;
            border-top: 2px solid #e8e8e8;
            margin-top: 0.5rem;
            font-weight: 600;
            color: #333;

            strong {
              color: #4caf50;
              font-size: 1.05rem;
            }
          }
        }
      }

      .error-message {
        padding: 1rem;
        background-color: #ffebee;
        border-left: 4px solid #f44336;
        border-radius: 2px;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        color: #c62828;

        mat-icon {
          color: #f44336;
        }
      }

      .processing {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        padding: 2rem;

        p {
          margin: 0;
          color: #666;
          font-size: 0.9rem;
        }
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem;
      border-top: 1px solid #e0e0e0;
      background-color: #f9f9f9;

      button {
        min-width: 120px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
    }
  `]
})
export class RazorpayCheckoutComponent implements OnInit, OnDestroy {
  processing = false;
  errorMessage = '';
  rateSplit: any;
  scriptLoaded = false;
  private destroy$ = new Subject<void>();
  private orderData: any = null;  // Store order data to avoid duplicate API calls

  constructor(
    private paymentService: PaymentService,
    public dialogRef: MatDialogRef<RazorpayCheckoutComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RazorpayCheckoutData,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.loadRazorpayScript();
  }

  ngOnInit(): void {
    this.fetchPaymentOrder();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRazorpayScript(): void {
    if (window.Razorpay) {
      this.scriptLoaded = true;
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      this.scriptLoaded = true;
    };
    script.onerror = () => {
      this.errorMessage = 'Failed to load payment gateway. Please try again.';
    };
    document.head.appendChild(script);
  }

  private fetchPaymentOrder(): void {
    this.processing = true;
    this.errorMessage = '';
    console.log('[RazorpayCheckout] Starting fetchPaymentOrder, processing=true');
    
    const request: CreatePaymentRequest = {
      jobId: this.data.jobId,
      bidId: this.data.bidId,
      amount: this.data.bidAmount
    };

    console.log('[RazorpayCheckout] Fetching payment order:', request);

    this.paymentService.createPaymentOrder(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (order) => {
          console.log('[RazorpayCheckout] Payment order received:', order);
          // Store order data for later use
          this.orderData = order;

          // Calculate bid amount (what the professional receives ultimately)
          const bidAmount = order.totalAmount - order.platformFee - order.gstOnPlatformFee;
          
          this.rateSplit = {
            bidAmount: bidAmount,
            platformFeePercent: 10,
            platformFee: order.platformFee,
            gstPercent: 18,
            gstOnPlatformFee: order.gstOnPlatformFee,
            proPayOut: order.proPayout
          };
          console.log('[RazorpayCheckout] Rate split calculated:', this.rateSplit);
          console.log('[RazorpayCheckout] About to set processing=false');
          this.processing = false;
          console.log('[RazorpayCheckout] processing set to false. Current value:', this.processing);
          this.cdr.markForCheck();  // Trigger change detection
          console.log('[RazorpayCheckout] Change detection marked');
        },
        error: (error) => {
          console.error('[RazorpayCheckout] Error in subscription:', error);
          const errorMsg = error?.error?.message || error?.message || 'Failed to initialize payment. Please try again.';
          this.errorMessage = errorMsg;
          console.error('[RazorpayCheckout] Error message set to:', this.errorMessage);
          this.processing = false;
          this.cdr.markForCheck();  // Trigger change detection on error too
          console.log('[RazorpayCheckout] Processing set to false after error. Current value:', this.processing);
        }
      });
  }

  initiatePayment(): void {
    console.log('[RazorpayCheckout] Initiate payment called');
    
    if (!this.scriptLoaded || !window.Razorpay) {
      console.error('[RazorpayCheckout] Razorpay script not loaded');
      this.errorMessage = 'Payment gateway not loaded. Please refresh and try again.';
      this.cdr.markForCheck();
      return;
    }

    if (!this.orderData) {
      console.error('[RazorpayCheckout] Order data not available');
      this.errorMessage = 'Payment order data not available. Please try again.';
      this.cdr.markForCheck();
      return;
    }

    console.log('[RazorpayCheckout] Opening Razorpay with order:', this.orderData);
    this.processing = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    try {
      const options = {
        key: this.orderData.key,
        amount: (this.orderData.totalAmount * 100),  // Convert to paisa
        currency: this.orderData.currency,
        order_id: this.orderData.orderId,
        name: 'yProHub',
        description: `Payment for job: ${this.data.jobTitle}`,
        customer_notify: 1,
        prefill: {
          name: this.data.consumerName,
          email: this.data.consumerEmail,
          contact: this.data.consumerPhone.replace(/\D/g, ''),
          ...(this.data.prefillVpa ? { vpa: this.data.prefillVpa } : {})
        },
        theme: {
          color: '#3f51b5'
        },
        handler: (response: any) => {
          console.log('[RazorpayCheckout] Payment handler response:', response);
          this.verifyPayment(response);
        },
        modal: {
          ondismiss: () => {
            console.log('[RazorpayCheckout] Payment modal dismissed');
            this.processing = false;
            this.cdr.markForCheck();
            this.snackBar.open('Payment cancelled', 'Close', { duration: 3000 });
          }
        }
      };

      const rzp1 = new window.Razorpay(options);
      console.log('[RazorpayCheckout] Razorpay checkout instance created');
      rzp1.open();
      this.processing = false;
      this.cdr.markForCheck();
    } catch (err) {
      console.error('[RazorpayCheckout] Error opening Razorpay:', err);
      this.processing = false;
      this.errorMessage = 'Failed to open payment gateway. Please try again.';
      this.cdr.markForCheck();
    }
  }

  private verifyPayment(response: any): void {
    console.log('[RazorpayCheckout] Verifying payment with response:', response);
    this.processing = true;
    this.cdr.markForCheck();

    const verifyRequest = {
      razorpayOrderId: response.razorpay_order_id,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature
    };

    this.paymentService.verifyPayment(verifyRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          console.log('[RazorpayCheckout] Payment verified successfully:', result);
          this.processing = false;
          this.cdr.markForCheck();
          this.snackBar.open('Payment successful! Job activated.', 'Close', { duration: 5000 });
          this.dialogRef.close({
            success: true,
            paymentId: result.paymentId,
            jobStatus: result.jobStatus
          });
        },
        error: (error) => {
          console.error('[RazorpayCheckout] Payment verification error:', error);
          this.processing = false;
          this.errorMessage = 'Payment verification failed. Please contact support.';
          this.cdr.markForCheck();
        }
      });
  }

  onCancel(): void {
    if (!this.processing) {
      this.dialogRef.close();
    }
  }
}
