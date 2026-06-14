import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TranslateModule } from '@ngx-translate/core';
import { JobService, Job, JobPhase, Message, JobBid } from '../../services/job.service.js';
import { Auth } from '../../core/services/auth';
import { ReviewService } from '../../services/review.service';
import { UserReview } from '../../models/review.model';
import { PaymentService } from '../../services/payment.service';
import { PaymentSummary } from '../../models/payment.model';
import { PaymentRequestDialogComponent } from '../payments/payment-request-dialog.component';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap, filter } from 'rxjs/operators';

@Component({
  selector: 'app-my-job-pro-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatDialogModule,
    TranslateModule
  ],
  templateUrl: './my-job-pro-details.html',
  styleUrl: './my-job-pro-details.scss'
})
export class MyJobProDetailsComponent implements OnInit, OnDestroy {
  job: Job | null = null;
  jobMessages: Message[] = [];
  jobBids: JobBid[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';
  unsavedJobIds: Set<number> = new Set();
  savingJobId: number | null = null;
  loadingMessages = false;
  loadingBids = false;
  messageText: string = '';
  messageSending = false;
  messageStatus: string = '';
  selectedTabIndex = 0;
  withdrawingBid = false;
  confirmingJob = false;
  resubmittingCompletion = false;
  completionStatus: string | null = null;
  disputeReason: string | null = null;
  userReview: UserReview | null = null;
  userReviewLoading = false;
  reviewRating = 0;
  reviewComment = '';
  reviewHoveredStar = 0;
  submittingReview = false;
  readonly starsArray = [1, 2, 3, 4, 5];
  paymentSummary: PaymentSummary | null = null;
  requestingPayment = false;
  private destroy$ = new Subject<void>();
  private pollMessages$ = new Subject<void>(); // Subject to control polling
  private currentJobId: number | null = null;
  private messagePollInterval = 5000; // 5 seconds

  // Predefined phase options for professionals to choose from
  readonly PHASE_OPTIONS: JobPhase[] = [
    { id: 'initialconsultation', title: 'Initial Consultation', description: 'Discuss requirements, scope, budget, and timeline', isCompleted: false },
    { id: 'initialestimation', title: 'Initial Estimation', description: 'Based on requirements, scope, budget, and timeline an initial estimation is created', isCompleted: false },
    { id: 'onsiteassessment', title: 'On-Site Assessment', description: 'Visit the site for assessment and review requirements, scope, budget and timeline', isCompleted: false },
    { id: 'proposalimprovements', title: 'Proposal & Improvements', description: 'Based on on-site assessment provide suggestions for improvements, if any', isCompleted: false },
    { id: 'finalestimation', title: 'Final Estimation', description: 'Based on on-site assessment a final estimation is created', isCompleted: false },
    { id: 'payment', title: 'Payment', description: 'Received payment for the job', isCompleted: false },
    { id: 'execution', title: 'Job Execution', description: 'Perform the work according to agreed plan and timeline', isCompleted: false },
    { id: 'inspection', title: 'Quality Inspection', description: 'Verify work quality and ensure all requirements are met', isCompleted: false },
    { id: 'walkthrough', title: 'Client Walkthrough', description: 'Walkthrough with client and address any adjustments', isCompleted: false },
    { id: 'delivery', title: 'Final Delivery', description: 'Complete delivery, documentation, and project closure', isCompleted: false },
    { id: 'testing', title: 'Testing & Verification', description: 'Comprehensive testing and verification of all deliverables', isCompleted: false },
    { id: 'training', title: 'Client Training', description: 'Provide training to client on project deliverables', isCompleted: false },
    { id: 'warranty', title: 'Warranty & Support', description: 'Provide post-completion warranty and technical support', isCompleted: false }
  ];

  constructor(
    private jobService: JobService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    public auth: Auth,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private reviewService: ReviewService,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    const jobId = this.activatedRoute.snapshot.paramMap.get('jobId');
    if (jobId) {
      this.loadJobDetails(parseInt(jobId, 10));
    } else {
      this.errorMessage = 'Job ID not found';
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.pollMessages$.next(); // Stop polling
    this.pollMessages$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadJobDetails(jobId: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.currentJobId = jobId; // Store job ID for polling
    
    this.jobService.getJob(jobId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (job) => {
        this.job = job;
        this.initializePhases(job);
        this.loading = false;
        this.cdr.markForCheck();
        this.loadBidsForJob(jobId);
        this.loadPaymentSummary(jobId);
        if (job.status === 'Completion Submitted') {
          this.loadCompletionStatus(jobId);
        }
        if (job.status === 'Completed') {
          this.loadJobUserReview(jobId);
        }
      },
      error: (error) => {
        console.error('Error loading job details:', error);
        
        let errorMsg = 'Failed to load job details.';
        
        if (error.status === 0) {
          errorMsg = 'Connection error. Please ensure the API server is running.';
        } else if (error.status === 401) {
          errorMsg = 'Unauthorized. Please login again.';
        } else if (error.status === 404) {
          errorMsg = 'Job not found.';
        } else if (error.status === 500) {
          errorMsg = 'Server error. Please try again later.';
        }
        
        this.errorMessage = errorMsg;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  initializePhases(job: Job): void {
    let phases: JobPhase[] = [];
    
    if (job.jobPhases) {
      if (typeof job.jobPhases === 'string') {
        try {
          phases = JSON.parse(job.jobPhases);
        } catch (e) {
          console.error('Failed to parse jobPhases:', e);
          phases = [];
        }
      } else if (Array.isArray(job.jobPhases)) {
        phases = job.jobPhases;
      }
    }
    
    // Map PascalCase properties from backend to camelCase for TypeScript
    phases = phases.map((phase: any) => ({
      id: phase.id || phase.Id || '',
      title: phase.title || phase.Title || '',
      description: phase.description || phase.Description || '',
      isCompleted: phase.isCompleted !== undefined ? phase.isCompleted : phase.IsCompleted || false,
      completedAt: phase.completedAt || phase.CompletedAt
    }));
    
    job.jobPhases = phases;
  }

  getJobPhases(job: Job): JobPhase[] {
    if (!job.jobPhases) {
      return [];
    }
    
    if (Array.isArray(job.jobPhases)) {
      return job.jobPhases;
    }
    
    if (typeof job.jobPhases === 'string') {
      try {
        const parsed = JSON.parse(job.jobPhases);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Failed to parse jobPhases:', e);
        return [];
      }
    }
    
    return [];
  }

  getPhaseProgress(job: Job): number {
    const phases = this.getJobPhases(job);
    if (phases.length === 0) return 0;
    const completed = phases.filter(p => p.isCompleted).length;
    return Math.round((completed / phases.length) * 100);
  }

  formatTimeline(timeline: string): string {
    const timelineMap: { [key: string]: string } = {
      'asap': 'ASAP (within 24 hours)',
      '1-week': 'Within 1 week',
      '1-month': 'Within 1 month',
      'flexible': 'No specific deadline'
    };
    return timelineMap[timeline] || timeline;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Open': return 'primary';
      case 'Bid Accepted': return 'primary';
      case 'Payment Made': return 'accent';
      case 'Pro Confirmed': return 'accent';
      case 'In Progress': return 'accent';
      case 'Completion Submitted': return 'warn';
      case 'Completed': return 'warn';
      default: return '';
    }
  }

  togglePhaseCompletion(job: Job, phaseId: string): void {
    const phases = this.getJobPhases(job);
    const phase = phases.find(p => p.id === phaseId);
    
    if (phase) {
      phase.isCompleted = !phase.isCompleted;
      phase.completedAt = phase.isCompleted ? new Date().toISOString() : undefined;
      
      job.jobPhases = [...phases];
      this.unsavedJobIds.add(job.id);
      
      this.cdr.markForCheck();
    }
  }

  savePhaseChanges(job: Job): void {
    if (!this.unsavedJobIds.has(job.id)) {
      return;
    }

    const phases = this.getJobPhases(job);
    this.savingJobId = job.id;
    
    this.jobService.updateJobPhases(job.id, phases).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.unsavedJobIds.delete(job.id);
        this.savingJobId = null;
        this.successMessage = 'Project phases updated successfully!';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.markForCheck();
        }, 3000);
      },
      error: (error) => {
        console.error('Error saving phase changes:', error);
        this.savingJobId = null;
        this.errorMessage = 'Failed to save phase changes. Please try again.';
        this.cdr.markForCheck();
      }
    });
  }

  hasUnsavedChanges(jobId: number): boolean {
    return this.unsavedJobIds.has(jobId);
  }

  openPhaseSelectionDialog(job: Job): void {
    if (!job) return;

    const currentPhaseIds = this.getJobPhases(job).map(p => p.id);
    const dialogRef = this.dialog.open(PhaseSelectionDialogComponent, {
      width: '600px',
      maxHeight: '80vh',
      data: {
        availablePhases: this.PHASE_OPTIONS,
        selectedPhaseIds: currentPhaseIds,
        maxPhases: 10
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.selectedPhases && result.selectedPhases.length > 0) {
        const selectedPhases: JobPhase[] = result.selectedPhases.map((phase: any) => ({
          ...phase,
          isCompleted: false
        }));
        
        job.jobPhases = selectedPhases;
        this.unsavedJobIds.add(job.id);
        this.cdr.markForCheck();
      }
    });
  }

  markAsCompleted(jobId: number): void {
    if (!this.job || this.job.id !== jobId) return;

    const dialogRef = this.dialog.open(ConfirmCompletionDialogComponent, {
      width: '400px',
      data: { jobTitle: this.job.title }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.jobService.markJobCompleted(jobId).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.successMessage = 'Job marked as completed!';
            if (this.job) {
              this.job.status = 'Completed';
            }
            this.cdr.markForCheck();
            setTimeout(() => {
              this.successMessage = '';
              this.cdr.markForCheck();
            }, 3000);
          },
          error: (error) => {
            console.error('Error marking job as completed:', error);
            this.errorMessage = 'Failed to mark job as completed. Please try again.';
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/my-jobs-pro']);
  }

  // Load bids for a job
  loadBidsForJob(jobId: number): void {
    this.loadingBids = true;

    this.jobService.getJobBids(jobId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (bids) => {
        this.jobBids = bids;
        this.loadingBids = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading bids:', error);
        this.jobBids = [];
        this.loadingBids = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Get the bid submitted by this professional
  getProBid(): JobBid | null {
    if (!this.job) {
      return null;
    }

    const currentUserIdStr = this.auth.getUserId();
    if (!currentUserIdStr) {
      return null;
    }

    const currentUserId = parseInt(currentUserIdStr, 10);
    
    // Find the bid from the current professional
    const proBid = this.jobBids.find(bid => 
      bid.proId === currentUserId
    );
    
    return proBid || null;
  }


  loadCompletionStatus(jobId: number): void {
    this.jobService.getJobCompletion(jobId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (c) => {
        this.completionStatus = c?.status ?? null;
        this.disputeReason = c?.disputeReason ?? null;
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  resubmitCompletion(): void {
    if (!this.job) return;
    this.resubmittingCompletion = true;
    this.jobService.resubmitCompletion(this.job.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.completionStatus = 'Submitted';
          this.disputeReason = null;
          this.resubmittingCompletion = false;
          this.successMessage = 'Completion resubmitted. Waiting for customer review.';
          this.cdr.markForCheck();
          setTimeout(() => { this.successMessage = ''; this.cdr.markForCheck(); }, 4000);
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to resubmit completion.';
          this.resubmittingCompletion = false;
          this.cdr.markForCheck();
        }
      });
  }

  loadJobUserReview(jobId: number): void {
    this.userReviewLoading = true;
    this.reviewService.getJobUserReview(jobId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: review => {
          this.userReview = review;
          this.userReviewLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.userReview = null;
          this.userReviewLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  submitUserReview(): void {
    if (!this.job || this.reviewRating === 0) return;
    this.submittingReview = true;
    this.reviewService.submitUserReview(this.job.id, this.reviewRating, this.reviewComment || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: review => {
          this.userReview = review;
          this.submittingReview = false;
          this.successMessage = 'Review submitted successfully!';
          this.cdr.markForCheck();
          setTimeout(() => { this.successMessage = ''; this.cdr.markForCheck(); }, 3000);
        },
        error: err => {
          this.errorMessage = err?.error?.message || 'Failed to submit review. Please try again.';
          this.submittingReview = false;
          this.cdr.markForCheck();
        }
      });
  }

  reviewStarFilled(rating: number, index: number): boolean {
    return index + 1 <= Math.round(rating);
  }

  loadPaymentSummary(jobId: number): void {
    this.paymentService.getPaymentSummary(jobId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (summary) => { this.paymentSummary = summary; this.cdr.markForCheck(); },
      error: () => { this.paymentSummary = null; this.cdr.markForCheck(); }
    });
  }

  /** Show the payment tile for every status once a bid is accepted (bidAmount > 0). */
  get hasPaymentInfo(): boolean {
    const s = this.paymentSummary;
    return !!s && s.bidAmount > 0;
  }

  /** Pro can raise a request when the job is assigned, not terminal, has a balance, and no pending request. */
  get canRequestPayment(): boolean {
    const s = this.paymentSummary;
    const terminal = this.job?.status === 'Completed' || this.job?.status === 'Cancelled';
    return !!s && !terminal && s.bidAmount > 0 && s.remaining > 0 &&
      !(s.activeRequest && s.activeRequest.status === 'Pending');
  }

  paymentProgress(): number {
    const s = this.paymentSummary;
    if (!s || s.bidAmount <= 0) return 0;
    return Math.round((s.totalPaidPrincipal / s.bidAmount) * 100);
  }

  requestPayment(): void {
    const s = this.paymentSummary;
    if (!this.job || !s) return;

    const dialogRef = this.dialog.open(PaymentRequestDialogComponent, {
      width: '460px',
      data: { jobTitle: this.job.title, bidAmount: s.bidAmount, remaining: s.remaining }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return;
      this.requestingPayment = true;
      this.cdr.markForCheck();
      this.paymentService.createPaymentRequest({ ...result, jobId: this.job!.id })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (summary) => {
            this.paymentSummary = summary;
            this.requestingPayment = false;
            this.successMessage = 'Payment request sent to the customer.';
            // A "No payment" request advances the job — reflect the new status.
            if (result.requestType === 'None' && this.job && this.job.status === 'Bid Accepted') {
              this.job.status = 'Payment Made';
            }
            this.cdr.markForCheck();
            setTimeout(() => { this.successMessage = ''; this.cdr.markForCheck(); }, 4000);
          },
          error: (err) => {
            this.requestingPayment = false;
            this.errorMessage = err?.error?.message || 'Failed to send payment request.';
            this.cdr.markForCheck();
            setTimeout(() => { this.errorMessage = ''; this.cdr.markForCheck(); }, 4000);
          }
        });
    });
  }

  cancelPaymentRequest(): void {
    const req = this.paymentSummary?.activeRequest;
    if (!req || !this.job) return;
    this.paymentService.cancelPaymentRequest(req.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary) => {
          this.paymentSummary = summary;
          this.successMessage = 'Payment request cancelled.';
          this.cdr.markForCheck();
          setTimeout(() => { this.successMessage = ''; this.cdr.markForCheck(); }, 3000);
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to cancel request.';
          this.cdr.markForCheck();
          setTimeout(() => { this.errorMessage = ''; this.cdr.markForCheck(); }, 3000);
        }
      });
  }

  confirmJob(): void {
    if (!this.job) return;
    this.confirmingJob = true;
    this.jobService.confirmJob(this.job.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.job!.status = 'In Progress';
          this.confirmingJob = false;
          this.successMessage = 'Job confirmed! Work is now in progress.';
          // Refresh the payment figures — the consumer's payment landed before this.
          this.loadPaymentSummary(this.job!.id);
          this.cdr.markForCheck();
          setTimeout(() => { this.successMessage = ''; this.cdr.markForCheck(); }, 3000);
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to confirm job.';
          this.confirmingJob = false;
          this.cdr.markForCheck();
        }
      });
  }

  withdrawBid(): void {
    const proBid = this.getProBid();
    if (!proBid || !this.job) return;

    if (!confirm('Are you sure you want to withdraw your bid? This cannot be undone.')) return;

    this.withdrawingBid = true;
    this.jobService.withdrawBid(this.job.id, proBid.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          proBid.status = 'Withdrawn';
          this.withdrawingBid = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error withdrawing bid:', err);
          this.errorMessage = err?.error?.message || 'Failed to withdraw bid.';
          this.withdrawingBid = false;
          this.cdr.markForCheck();
        }
      });
  }

  // Navigate to messages page with partner ID
  goToMessagesPage(): void {
    if (!this.job || !this.job.userId) return;

    this.router.navigate(['/messages'], {
      queryParams: { 
        partnerId: this.job.userId.toString()
      }
    });
  }

  // Get bid status color
  getBidStatusColor(status: string): string {
    switch (status) {
      case 'Pending':
        return 'primary';
      case 'Accepted':
        return 'accent';
      case 'Rejected':
        return 'warn';
      default:
        return '';
    }
  }

  // Format bid status
  getBidStatus(status: string): string {
    switch (status) {
      case 'Pending': return 'Pending';
      case 'Accepted': return 'Accepted';
      case 'Rejected': return 'Rejected';
      case 'Withdrawn': return 'Withdrawn';
      default: return status ?? 'Unknown';
    }
  }
}

// Confirmation Dialog Component
import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-confirm-completion-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="confirmation-dialog">
      <div class="dialog-header">
        <mat-icon class="dialog-icon">check_circle_outline</mat-icon>
        <h2>Mark Job as Completed?</h2>
      </div>
      
      <div class="dialog-content">
        <p>Are you sure you want to mark <strong>{{ data.jobTitle }}</strong> as completed?</p>
        <p class="dialog-note">This action cannot be undone.</p>
      </div>
      
      <div class="dialog-actions">
        <button mat-button (click)="onCancel()">
          Cancel
        </button>
        <button mat-raised-button color="accent" (click)="onConfirm()">
          <mat-icon>check</mat-icon>
          Mark as Completed
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirmation-dialog {
      padding: 20px;
    }
    
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .dialog-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #4caf50;
    }
    
    .dialog-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }
    
    .dialog-content {
      margin-bottom: 24px;
      line-height: 1.6;
    }
    
    .dialog-content p {
      margin: 8px 0;
    }
    
    .dialog-note {
      font-size: 13px;
      color: #666;
      font-style: italic;
    }
    
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    
    button {
      min-width: 120px;
    }
  `]
})
export class ConfirmCompletionDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmCompletionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { jobTitle: string }
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
// Phase Selection Dialog Component
@Component({
  selector: 'app-phase-selection-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, MatCheckboxModule, MatFormFieldModule],
  template: `
    <div class="phase-selection-dialog">
      <h2 mat-dialog-title>Select Project Phases (Maximum 10)</h2>
      
      <mat-dialog-content>
        <div class="selection-info">
          <p>Selected: <strong>{{ selectedPhases.length }} / {{ data.maxPhases }}</strong> phases</p>
        </div>

        <div class="phases-grid">
          <div *ngFor="let phase of data.availablePhases" class="phase-option">
            <mat-checkbox 
              [checked]="isPhaseSelected(phase.id)"
              [disabled]="!isPhaseSelected(phase.id) && selectedPhases.length >= data.maxPhases"
              (change)="togglePhaseSelection(phase)">
            </mat-checkbox>
            <div class="phase-info">
              <h4>{{ phase.title }}</h4>
              <p>{{ phase.description }}</p>
            </div>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          <mat-icon>close</mat-icon>
          Cancel
        </button>
        <button mat-raised-button color="accent" (click)="onSave()" [disabled]="selectedPhases.length === 0">
          <mat-icon>save</mat-icon>
          Save Phases
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .phase-selection-dialog {
      min-width: 500px;
    }

    .selection-info {
      margin-bottom: 16px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 6px;
    }

    .selection-info p {
      margin: 0;
      font-size: 14px;
    }

    .phases-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-height: 400px;
      overflow-y: auto;
    }

    .phase-option {
      display: flex;
      gap: 12px;
      padding: 12px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      align-items: flex-start;

      &:hover {
        background: #f9f9f9;
      }
    }

    .phase-option mat-checkbox {
      flex-shrink: 0;
      margin-top: 2px;
    }

    .phase-info {
      flex: 1;
    }

    .phase-info h4 {
      margin: 0 0 4px 0;
      font-size: 14px;
      font-weight: 500;
    }

    .phase-info p {
      margin: 0;
      font-size: 12px;
      color: #666;
      line-height: 1.4;
    }

    mat-dialog-actions {
      gap: 8px;
    }
  `]
})
export class PhaseSelectionDialogComponent {
  selectedPhases: JobPhase[] = [];

  constructor(
    public dialogRef: MatDialogRef<PhaseSelectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { availablePhases: JobPhase[]; selectedPhaseIds: string[]; maxPhases: number }
  ) {
    this.selectedPhases = data.availablePhases.filter(p => data.selectedPhaseIds.includes(p.id));
  }

  isPhaseSelected(phaseId: string): boolean {
    return this.selectedPhases.some(p => p.id === phaseId);
  }

  togglePhaseSelection(phase: JobPhase): void {
    const index = this.selectedPhases.findIndex(p => p.id === phase.id);
    if (index >= 0) {
      this.selectedPhases.splice(index, 1);
    } else if (this.selectedPhases.length < this.data.maxPhases) {
      this.selectedPhases.push({ ...phase });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.selectedPhases.length > 0) {
      this.dialogRef.close({ selectedPhases: this.selectedPhases });
    }
  }
}