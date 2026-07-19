import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { JobPaymentRequest } from '../../models/payment.model';

export interface PayAmountDialogData {
  jobTitle: string;
  bidAmount: number;
  remaining: number;
  activeRequest?: JobPaymentRequest | null;
}

/**
 * Consumer-facing dialog to choose how much to pay toward a job: the requested amount,
 * the full remaining balance, or a custom amount (bounded by the Pro's minimum and the remaining).
 * Returns the chosen principal amount (number) or undefined if cancelled.
 */
@Component({
  selector: 'app-pay-amount-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatRadioModule
  ],
  template: `
    <div class="pa-dialog">

      <!-- Header -->
      <div class="pa-head">
        <div class="pa-head-icon">
          <mat-icon>currency_rupee</mat-icon>
        </div>
        <div class="pa-head-text">
          <h2>Choose Payment Amount</h2>
          <p>{{ data.jobTitle }}</p>
        </div>
        <button mat-icon-button class="pa-close" (click)="dialogRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="pa-body">

        <!-- Balance -->
        <div class="pa-section">
          <div class="pa-section-header">
            <mat-icon>account_balance_wallet</mat-icon>
            <span>Balance</span>
          </div>
          <div class="pa-balance">
            <div><span>Agreed total</span><strong>₹{{ data.bidAmount | number:'1.2-2' }}</strong></div>
            <div><span>Remaining</span><strong>₹{{ data.remaining | number:'1.2-2' }}</strong></div>
          </div>
          <p *ngIf="requestedAmount > 0" class="pa-requested">
            <mat-icon>request_quote</mat-icon>
            The professional requested <strong>&nbsp;₹{{ requestedAmount | number:'1.2-2' }}</strong>.
          </p>
        </div>

        <!-- Amount choice -->
        <div class="pa-section">
          <div class="pa-section-header">
            <mat-icon>payments</mat-icon>
            <span>Amount to Pay</span>
          </div>
          <mat-radio-group [(ngModel)]="choice" class="pa-radio-group" (ngModelChange)="error = ''">
            <mat-radio-button *ngIf="requestedAmount > 0 && requestedAmount <= data.remaining + 0.01" value="requested">
              Pay requested — ₹{{ requestedAmount | number:'1.2-2' }}
            </mat-radio-button>
            <mat-radio-button value="full">
              Pay remaining (full) — ₹{{ data.remaining | number:'1.2-2' }}
            </mat-radio-button>
            <mat-radio-button value="custom">Custom amount</mat-radio-button>
          </mat-radio-group>

          <mat-form-field *ngIf="choice === 'custom'" appearance="outline" class="pa-field">
            <mat-label>Amount to pay (₹)</mat-label>
            <input matInput type="number" [(ngModel)]="customAmount" [min]="floor" [max]="data.remaining">
            <mat-hint>Between ₹{{ floor | number:'1.2-2' }} and ₹{{ data.remaining | number:'1.2-2' }}.</mat-hint>
          </mat-form-field>
        </div>

        <div *ngIf="error" class="pa-error"><mat-icon>error_outline</mat-icon> {{ error }}</div>
      </div>

      <!-- Footer -->
      <div class="pa-footer">
        <button mat-button class="pa-cancel-btn" (click)="dialogRef.close()">Cancel</button>
        <button class="pa-pay-btn" (click)="proceed()">
          <mat-icon>lock</mat-icon> Continue to Pay
        </button>
      </div>
    </div>
  `,
  styles: [`
    .pa-dialog {
      width: 100%;
      min-width: 320px;
      max-width: 440px;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
    }

    .pa-head {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1.2rem 1.5rem;
      border-bottom: 1px solid var(--color-border);
    }

    .pa-head-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--color-primary-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon { color: white; font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
    }

    .pa-head-text {
      flex: 1;
      min-width: 0;
      h2 { margin: 0 0 0.1rem; font-size: 1.05rem; font-weight: 700; color: var(--color-text); }
      p { margin: 0; font-size: 0.82rem; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    }

    .pa-close { flex-shrink: 0; color: #aaa; }

    .pa-body {
      flex: 1;
      overflow-y: auto;
      padding: 1rem 1.5rem 0.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .pa-section {
      background: #fafbff;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 0.9rem 1rem;
    }

    .pa-section-header {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      margin-bottom: 0.85rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      mat-icon { font-size: 0.9rem; width: 0.9rem; height: 0.9rem; color: var(--color-primary); }
    }

    .pa-balance {
      display: flex;
      gap: 2rem;
    }

    .pa-balance > div { display: flex; flex-direction: column; }
    .pa-balance span { font-size: 0.72rem; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
    .pa-balance strong { font-size: 1rem; color: var(--color-text); }

    .pa-requested {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      color: var(--color-text-muted);
      margin: 0.75rem 0 0;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; color: var(--color-primary); }
      strong { color: var(--color-text); }
    }

    .pa-radio-group { display: flex; flex-direction: column; gap: 8px; }
    .pa-field { width: 100%; margin-top: 0.75rem; }

    .pa-error {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.7rem 0.9rem;
      background: #fff0f0;
      border: 1px solid #ffcdd2;
      border-radius: 8px;
      color: var(--color-error);
      font-size: 0.87rem;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    }

    .pa-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--color-border);
      background: white;
    }

    .pa-cancel-btn { color: var(--color-text-muted); }

    .pa-pay-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.65rem 1.6rem;
      background: var(--color-primary-gradient);
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.15s;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
      &:hover { opacity: 0.91; }
    }
  `]
})
export class PayAmountDialogComponent {
  choice: 'requested' | 'full' | 'custom' = 'full';
  customAmount: number | null = null;
  error = '';

  constructor(
    public dialogRef: MatDialogRef<PayAmountDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PayAmountDialogData
  ) {
    const req = data.activeRequest;
    this.requestedAmount = req && req.requestType !== 'None' ? req.requestedAmount : 0;
    // Default to the requested amount when one is set and payable.
    if (this.requestedAmount > 0 && this.requestedAmount <= data.remaining + 0.01) {
      this.choice = 'requested';
    }
    this.customAmount = Math.min(this.requestedAmount || data.remaining, data.remaining);
  }

  requestedAmount = 0;

  /** Minimum allowed for a custom amount: the Pro's floor (minAmount), else any positive amount. */
  get floor(): number {
    const min = this.data.activeRequest?.minAmount ?? 0;
    return Math.min(Math.max(min, 0), this.data.remaining);
  }

  proceed(): void {
    this.error = '';
    let amount: number;
    if (this.choice === 'requested') {
      amount = this.requestedAmount;
    } else if (this.choice === 'full') {
      amount = this.data.remaining;
    } else {
      amount = this.customAmount || 0;
      if (amount + 0.01 < this.floor) {
        this.error = `Minimum payment is ₹${this.floor.toFixed(2)}.`;
        return;
      }
    }

    if (amount <= 0) { this.error = 'Enter an amount greater than zero.'; return; }
    if (amount > this.data.remaining + 0.01) {
      this.error = `Amount cannot exceed the remaining balance of ₹${this.data.remaining.toFixed(2)}.`;
      return;
    }

    // Clamp to remaining to avoid float drift on "full".
    this.dialogRef.close(Math.min(amount, this.data.remaining));
  }
}
