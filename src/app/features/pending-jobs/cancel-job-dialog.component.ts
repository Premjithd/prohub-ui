import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface CancelJobDialogData {
  jobTitle: string;
}

/**
 * Consumer-facing confirmation dialog for cancelling a job. Follows the in-page
 * dialog layout used by the "Pay now" popup (see PayAmountDialogComponent).
 * Returns `true` when the user confirms cancellation, otherwise undefined.
 */
@Component({
  selector: 'app-cancel-job-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="cj-dialog">

      <!-- Header -->
      <div class="cj-head">
        <div class="cj-head-icon">
          <mat-icon>cancel</mat-icon>
        </div>
        <div class="cj-head-text">
          <h2>Cancel Job?</h2>
          <p>{{ data.jobTitle }}</p>
        </div>
        <button mat-icon-button class="cj-close" (click)="dialogRef.close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="cj-body">
        <div class="cj-warning">
          <mat-icon>warning_amber</mat-icon>
          <div>
            <p>All pending bids will be automatically withdrawn.</p>
            <p class="cj-irreversible">This action cannot be undone.</p>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="cj-footer">
        <button mat-button class="cj-keep-btn" (click)="dialogRef.close()">Keep Job</button>
        <button class="cj-cancel-btn" (click)="dialogRef.close(true)">
          <mat-icon>cancel</mat-icon> Cancel Job
        </button>
      </div>
    </div>
  `,
  styles: [`
    .cj-dialog {
      width: 100%;
      min-width: 320px;
      max-width: 440px;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
    }

    .cj-head {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 1.2rem 1.5rem;
      border-bottom: 1px solid var(--color-border);
    }

    .cj-head-icon {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: linear-gradient(135deg, #ef4444, #dc2626);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon { color: white; font-size: 1.2rem; width: 1.2rem; height: 1.2rem; }
    }

    .cj-head-text {
      flex: 1;
      min-width: 0;
      h2 { margin: 0 0 0.1rem; font-size: 1.05rem; font-weight: 700; color: var(--color-text); }
      p { margin: 0; font-size: 0.82rem; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    }

    .cj-close { flex-shrink: 0; color: #aaa; }

    .cj-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem 1.5rem;
    }

    .cj-warning {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.9rem 1rem;
      background: #fff8f1;
      border: 1px solid #fde3c8;
      border-radius: 12px;
      mat-icon { color: #f59e0b; flex-shrink: 0; }
      p { margin: 0; font-size: 0.9rem; color: var(--color-text); }
      .cj-irreversible { margin-top: 0.25rem; font-weight: 700; color: #b91c1c; }
    }

    .cj-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--color-border);
      background: white;
    }

    .cj-keep-btn { color: var(--color-text-muted); }

    .cj-cancel-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.65rem 1.6rem;
      background: linear-gradient(135deg, #ef4444, #dc2626);
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
export class CancelJobDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<CancelJobDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CancelJobDialogData
  ) {}
}
