import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Material } from '../../models/material.model';
import { MaterialService } from '../../services/material.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

export interface BidDialogData {
  jobTitle: string;
  jobBudget: string;
  serviceCategoryId: number;
  isResubmission?: boolean;
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
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="bid-dialog-container">
      <div class="dialog-header">
        <h2>Submit Your Bid</h2>
        <button mat-icon-button (click)="onCancel()" class="close-btn" [disabled]="submitting">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="dialog-content">
        <p class="job-title">For: <strong>{{ data.jobTitle }}</strong></p>
        <p class="job-budget">Budget: <strong>{{ data.jobBudget }}</strong></p>

        <form [formGroup]="bidForm">
          <!-- Bid Amount (Quoted Price) -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Quoted Price (₹)</mat-label>
            <input
              matInput
              type="number"
              formControlName="quotedPrice"
              placeholder="Enter your quoted price"
              step="100"
              min="0"
            />
            <mat-icon matPrefix>attach_money</mat-icon>
            <mat-error *ngIf="bidForm.get('quotedPrice')?.hasError('required')">
              Quoted price is required
            </mat-error>
            <mat-error *ngIf="bidForm.get('quotedPrice')?.hasError('min')">
              Price must be greater than 0
            </mat-error>
          </mat-form-field>

          <!-- Commence Date -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Commence Date</mat-label>
            <input
              matInput
              formControlName="commenceDate"
              [matDatepicker]="picker"
              placeholder="Select start date"
            />
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            <mat-error *ngIf="bidForm.get('commenceDate')?.hasError('required')">
              Start date is required
            </mat-error>
          </mat-form-field>

          <!-- Expected Duration Days -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Expected Duration (Days)</mat-label>
            <input
              matInput
              type="number"
              formControlName="expectedDurationDays"
              placeholder="Number of days to complete"
              min="1"
            />
            <mat-icon matPrefix>schedule</mat-icon>
            <mat-error *ngIf="bidForm.get('expectedDurationDays')?.hasError('required')">
              Duration is required
            </mat-error>
            <mat-error *ngIf="bidForm.get('expectedDurationDays')?.hasError('min')">
              Duration must be at least 1 day
            </mat-error>
          </mat-form-field>

          <!-- Materials Description -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Materials & Details</mat-label>
            <textarea
              matInput
              formControlName="materialsDescription"
              placeholder="Describe materials you'll bring, brands, quality, or any special details..."
              rows="4"
            ></textarea>
            <mat-icon matPrefix>build</mat-icon>
            <mat-hint>{{ (bidForm.get('materialsDescription')?.value || '').length }}/2000</mat-hint>
            <mat-error *ngIf="bidForm.get('materialsDescription')?.hasError('maxlength')">
              Description cannot exceed 2000 characters
            </mat-error>
          </mat-form-field>

          <!-- Message to Client (Optional) -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Message to Client (Optional)</mat-label>
            <textarea
              matInput
              formControlName="message"
              placeholder="Tell the client why you're a good fit for this job..."
              rows="4"
            ></textarea>
            <mat-icon matPrefix>message</mat-icon>
            <mat-hint>{{ (bidForm.get('message')?.value || '').length }}/500</mat-hint>
            <mat-error *ngIf="bidForm.get('message')?.hasError('maxlength')">
              Message cannot exceed 500 characters
            </mat-error>
          </mat-form-field>
        </form>

        <!-- Loading spinner -->
        <div *ngIf="submitting" class="loading-overlay">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Submitting your bid...</p>
        </div>
      </div>

      <div class="dialog-actions">
        <button mat-button (click)="onCancel()" [disabled]="submitting">
          Cancel
        </button>
        <button
          mat-raised-button
          color="primary"
          (click)="onSubmit()"
          [disabled]="!bidForm.valid || submitting"
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
      min-width: 450px;
      max-height: 90vh;
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
      overflow-y: auto;
      position: relative;

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

      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        z-index: 999;

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

      .submit-btn {
        min-width: 150px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
    }
  `]
})
export class BidSubmissionDialogComponent implements OnInit, OnDestroy {
  bidForm!: FormGroup;
  materials: Material[] = [];
  submitting = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private materialService: MaterialService,
    public dialogRef: MatDialogRef<BidSubmissionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: BidDialogData
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadMaterials();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.bidForm = this.fb.group({
      quotedPrice: ['', [Validators.required, Validators.min(100)]],
      commenceDate: [tomorrow, [Validators.required]],
      expectedDurationDays: ['', [Validators.required, Validators.min(1)]],
      materialsDescription: ['', [Validators.maxLength(2000)]],
      message: ['', [Validators.maxLength(500)]]
    });
  }

  private loadMaterials(): void {
    if (this.data.serviceCategoryId) {
      this.materialService.getMaterialsByCategory(this.data.serviceCategoryId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (materials) => {
            this.materials = materials;
          },
          error: (error) => {
            console.error('Error loading materials:', error);
          }
        });
    }
  }

  onSubmit(): void {
    if (this.bidForm.valid) {
      this.submitting = true;
      this.dialogRef.close({
        quotedPrice: parseFloat(this.bidForm.get('quotedPrice')?.value || '0'),
        commenceDate: this.bidForm.get('commenceDate')?.value,
        expectedDurationDays: parseInt(this.bidForm.get('expectedDurationDays')?.value || '0', 10),
        materialsDescription: this.bidForm.get('materialsDescription')?.value || '',
        message: this.bidForm.get('message')?.value || ''
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
