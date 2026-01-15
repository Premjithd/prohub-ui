import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface BidDialogData {
  jobTitle: string;
  jobBudget: string;
}

@Component({
  selector: 'app-bid-submission-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="bid-dialog-container">
      <div class="dialog-header">
        <h2>Submit Your Bid</h2>
        <button mat-icon-button (click)="onCancel()" class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-content">
        <p class="job-title">For: <strong>{{ data.jobTitle }}</strong></p>
        <p class="job-budget">Budget: <strong>{{ data.jobBudget }}</strong></p>

        <form [formGroup]="bidForm">
          <!-- Bid Amount -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Proposed Amount ($)</mat-label>
            <input
              matInput
              type="number"
              formControlName="amount"
              placeholder="Enter your proposed amount"
              step="0.01"
              min="0"
            />
            <mat-icon matPrefix>attach_money</mat-icon>
            <mat-error *ngIf="bidForm.get('amount')?.hasError('required')">
              Amount is required
            </mat-error>
            <mat-error *ngIf="bidForm.get('amount')?.hasError('min')">
              Amount must be greater than 0
            </mat-error>
          </mat-form-field>

          <!-- Bid Message -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Message to Client (Optional)</mat-label>
            <textarea
              matInput
              formControlName="message"
              placeholder="Tell the client why you're a good fit for this job..."
              rows="5"
            ></textarea>
            <mat-icon matPrefix>message</mat-icon>
            <mat-hint>{{ bidForm.get('message')?.value?.length || 0 }}/500</mat-hint>
            <mat-error *ngIf="bidForm.get('message')?.hasError('maxlength')">
              Message cannot exceed 500 characters
            </mat-error>
          </mat-form-field>
        </form>
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="onCancel()" class="cancel-btn">
          Cancel
        </button>
        <button
          mat-raised-button
          color="primary"
          (click)="onSubmit()"
          [disabled]="!bidForm.valid"
          class="submit-btn"
        >
          <mat-icon>send</mat-icon>
          Submit Bid
        </button>
      </div>
    </div>
  `,
  styles: [`
    .bid-dialog-container {
      width: 100%;
      display: flex;
      flex-direction: column;
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

      .job-title,
      .job-budget {
        margin: 0.5rem 0;
        color: #666;
        font-size: 0.95rem;

        strong {
          color: #333;
          font-weight: 600;
        }
      }

      .job-budget {
        margin-bottom: 1.5rem;
      }

      form {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .full-width {
        width: 100%;
      }

      mat-form-field {
        width: 100%;
      }

      textarea {
        font-family: inherit;
        resize: vertical;
      }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem;
      border-top: 1px solid #e0e0e0;
      background-color: #f9f9f9;

      .cancel-btn {
        min-width: 100px;
      }

      .submit-btn {
        min-width: 150px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
    }
  `]
})
export class BidSubmissionDialogComponent implements OnInit {
  bidForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<BidSubmissionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BidDialogData
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    // Form already initialized in constructor
  }

  private initializeForm(): void {
    this.bidForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(0.01)]],
      message: ['', [Validators.maxLength(500)]]
    });
  }

  onSubmit(): void {
    if (this.bidForm.valid) {
      this.dialogRef.close({
        amount: parseFloat(this.bidForm.get('amount')?.value || '0'),
        message: this.bidForm.get('message')?.value || ''
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
