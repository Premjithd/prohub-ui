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
      <h2 mat-dialog-title>Choose Payment Amount</h2>

      <mat-dialog-content>
        <p class="pa-sub">{{ data.jobTitle }}</p>

        <div class="pa-balance">
          <div><span>Agreed total</span><strong>₹{{ data.bidAmount | number:'1.2-2' }}</strong></div>
          <div><span>Remaining</span><strong>₹{{ data.remaining | number:'1.2-2' }}</strong></div>
        </div>

        <p *ngIf="requestedAmount > 0" class="pa-requested">
          <mat-icon>request_quote</mat-icon>
          The professional requested <strong>₹{{ requestedAmount | number:'1.2-2' }}</strong>.
        </p>

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

        <div *ngIf="error" class="pa-error"><mat-icon>error_outline</mat-icon> {{ error }}</div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="dialogRef.close()">Cancel</button>
        <button mat-raised-button color="accent" (click)="proceed()">
          <mat-icon>lock</mat-icon> Continue to Pay
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .pa-dialog { min-width: 360px; max-width: 440px; }
    .pa-sub { margin: 0 0 12px; color: #666; font-size: 0.9rem; }
    .pa-balance {
      display: flex; gap: 16px; padding: 10px 12px; background: #f0fdf4;
      border-radius: 8px; margin-bottom: 12px;
    }
    .pa-balance > div { display: flex; flex-direction: column; }
    .pa-balance span { font-size: 0.72rem; color: #888; text-transform: uppercase; letter-spacing: 0.04em; }
    .pa-balance strong { font-size: 1rem; color: #1a1a2e; }
    .pa-requested {
      display: flex; align-items: center; gap: 6px; font-size: 0.88rem; color: #555; margin: 0 0 12px;
      mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; color: #667eea; }
    }
    .pa-radio-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
    .pa-field { width: 100%; }
    .pa-error {
      display: flex; align-items: center; gap: 6px; color: #c62828; font-size: 0.85rem; margin-top: 4px;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
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
