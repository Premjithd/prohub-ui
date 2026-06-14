import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { PaymentRequestType, CreatePaymentRequestRequest } from '../../models/payment.model';

export interface PaymentRequestDialogData {
  jobTitle: string;
  bidAmount: number;
  remaining: number;
}

/**
 * Pro-facing dialog to raise a payment request: No payment / Partial / Full.
 * For Partial the Pro enters a ₹ amount (≤ remaining) and a minimum percentage the consumer must pay.
 */
@Component({
  selector: 'app-payment-request-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatRadioModule
  ],
  template: `
    <div class="pr-dialog">
      <h2 mat-dialog-title>Request Payment</h2>

      <mat-dialog-content>
        <p class="pr-sub">{{ data.jobTitle }}</p>

        <div class="pr-balance">
          <div><span>Agreed total</span><strong>₹{{ data.bidAmount | number:'1.2-2' }}</strong></div>
          <div><span>Remaining</span><strong>₹{{ data.remaining | number:'1.2-2' }}</strong></div>
        </div>

        <mat-radio-group [(ngModel)]="requestType" class="pr-radio-group" (ngModelChange)="onTypeChange()">
          <mat-radio-button value="Full">Full payment (₹{{ data.remaining | number:'1.2-2' }})</mat-radio-button>
          <mat-radio-button value="Partial">Partial payment</mat-radio-button>
          <mat-radio-button value="None">No payment — proceed now, collect later</mat-radio-button>
        </mat-radio-group>

        <div *ngIf="requestType === 'Partial'" class="pr-partial">
          <mat-form-field appearance="outline" class="pr-field">
            <mat-label>Amount to request (₹)</mat-label>
            <input matInput type="number" [(ngModel)]="requestedAmount" min="1" [max]="data.remaining">
          </mat-form-field>

          <mat-form-field appearance="outline" class="pr-field">
            <mat-label>Minimum the customer must pay (%)</mat-label>
            <input matInput type="number" [(ngModel)]="minPercent" min="0" max="100">
            <mat-hint>Customer can pay any amount from {{ floorAmount | number:'1.2-2' }} up to the remaining balance.</mat-hint>
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="pr-field">
          <mat-label>Note to customer (optional)</mat-label>
          <textarea matInput [(ngModel)]="note" rows="2" maxlength="500"></textarea>
        </mat-form-field>

        <div *ngIf="error" class="pr-error"><mat-icon>error_outline</mat-icon> {{ error }}</div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="dialogRef.close()">Cancel</button>
        <button mat-raised-button color="primary" (click)="submit()">
          <mat-icon>send</mat-icon> Send Request
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .pr-dialog { min-width: 380px; max-width: 460px; }
    .pr-sub { margin: 0 0 12px; color: #666; font-size: 0.9rem; }
    .pr-balance {
      display: flex; gap: 16px; padding: 10px 12px; background: #f5f3ff;
      border-radius: 8px; margin-bottom: 16px;
    }
    .pr-balance > div { display: flex; flex-direction: column; }
    .pr-balance span { font-size: 0.72rem; color: #888; text-transform: uppercase; letter-spacing: 0.04em; }
    .pr-balance strong { font-size: 1rem; color: #1a1a2e; }
    .pr-radio-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
    .pr-partial { display: flex; flex-direction: column; }
    .pr-field { width: 100%; }
    .pr-error {
      display: flex; align-items: center; gap: 6px; color: #c62828; font-size: 0.85rem; margin-top: 4px;
      mat-icon { font-size: 1rem; width: 1rem; height: 1rem; }
    }
  `]
})
export class PaymentRequestDialogComponent {
  requestType: PaymentRequestType = 'Full';
  requestedAmount: number | null = null;
  minPercent = 50;
  note = '';
  error = '';

  constructor(
    public dialogRef: MatDialogRef<PaymentRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PaymentRequestDialogData
  ) {}

  get floorAmount(): number {
    const amt = this.requestedAmount || 0;
    return Math.min(amt * (this.minPercent || 0) / 100, this.data.remaining);
  }

  onTypeChange(): void {
    this.error = '';
  }

  submit(): void {
    this.error = '';
    if (this.requestType === 'Partial') {
      const amt = this.requestedAmount || 0;
      if (amt <= 0) { this.error = 'Enter an amount greater than zero.'; return; }
      if (amt > this.data.remaining + 0.01) {
        this.error = `Amount cannot exceed the remaining balance of ₹${this.data.remaining.toFixed(2)}.`;
        return;
      }
      if (this.minPercent < 0 || this.minPercent > 100) {
        this.error = 'Minimum percentage must be between 0 and 100.';
        return;
      }
    }

    const result: CreatePaymentRequestRequest = {
      jobId: 0, // filled by caller
      requestType: this.requestType,
      requestedAmount: this.requestType === 'Partial' ? (this.requestedAmount || 0) : 0,
      minPercent: this.requestType === 'Partial' ? this.minPercent : 0,
      note: this.note?.trim() || undefined
    };
    this.dialogRef.close(result);
  }
}
