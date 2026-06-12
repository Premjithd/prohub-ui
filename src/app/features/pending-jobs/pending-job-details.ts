import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { JobService, Job, JobBid, JobPhase, Message } from '../../services/job.service.js';
import { PaymentService } from '../../services/payment.service';
import { RazorpayCheckoutComponent } from '../payments/razorpay-checkout.component';
import { Auth } from '../../core/services/auth';
import { ReviewService } from '../../services/review.service';
import { Review } from '../../models/review.model';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap, filter } from 'rxjs/operators';

@Component({
  selector: 'app-pending-job-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatExpansionModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './pending-job-details.html',
  styleUrl: './pending-job-details.scss'
})
export class PendingJobDetailsComponent implements OnInit, OnDestroy {
  job: Job | null = null;
  jobBids: JobBid[] = [];
  jobMessages: Message[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';
  loadingBids = false;
  loadingMessages = false;
  paymentStatus: { status: string; completed: boolean } | null = null;
  loadingPayment = false;
  messageText: string = '';
  messageSending = false;
  messageStatus: string = '';
  selectedTabIndex = 0; // Track selected tab: 0 = Messages (default), 1 = Bid Details
  private destroy$ = new Subject<void>();
  private pollMessages$ = new Subject<void>(); // Subject to control polling
  private currentJobId: number | null = null;
  private messagePollInterval = 5000; // 5 seconds

  existingReview: Review | null = null;
  loadingReview = false;
  cancellingJob = false;
  completionStatus: string | null = null;
  disputeReason: string | null = null;
  paymentId: number | null = null;
  requestingRefund = false;

  constructor(
    private jobService: JobService,
    private paymentService: PaymentService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    public auth: Auth,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private reviewService: ReviewService
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
        this.loading = false;
        this.cdr.markForCheck();
        // Load bids for the job
        this.loadBidsForJob(jobId);
        // Always attempt to load payment and completion — both handle 404 gracefully
        this.loadPaymentStatus(jobId);
        this.loadCompletionStatus(jobId);
        // Load review status if job is completed
        if (job.status === 'Completed') {
          this.loadReview(jobId);
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

  goBack(): void {
    this.router.navigate(['/pending-jobs']);
  }

  cancelJob(): void {
    if (!this.job) return;

    if (!confirm(`Cancel "${this.job.title}"? All pending bids will be automatically withdrawn. This cannot be undone.`)) return;

    this.cancellingJob = true;
    this.errorMessage = '';

    this.jobService.cancelJob(this.job.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.job!.status = 'Cancelled';
          this.jobBids = this.jobBids.map(b => b.status === 'Pending' ? { ...b, status: 'Withdrawn' } : b);
          this.successMessage = 'Job cancelled successfully.';
          this.cancellingJob = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to cancel job.';
          this.cancellingJob = false;
          this.cdr.markForCheck();
        }
      });
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

  formatTimeline(timeline: string): string {
    const timelineMap: { [key: string]: string } = {
      'asap': 'ASAP (within 24 hours)',
      '1-week': 'Within 1 week',
      '1-month': 'Within 1 month',
      'flexible': 'No specific deadline'
    };
    return timelineMap[timeline] || timeline;
  }

  getBidStatusColor(status: string): string {
    switch (status) {
      case 'Pending':
        return 'primary';
      case 'Accepted':
        return 'accent';
      case 'Rejected':
      case 'Withdrawn':
        return 'warn';
      default:
        return '';
    }
  }

  getBidStatus(status: string): string {
    switch (status) {
      case 'Pending':
        return 'Pending';
      case 'Accepted':
        return 'Accepted';
      case 'Rejected':
        return 'Rejected';
      case 'Withdrawn':
        return 'Withdrawn';
      default:
        return status || 'Unknown';
    }
  }

  loadPaymentStatus(jobId: number): void {
    this.loadingPayment = true;
    this.paymentService.getPaymentByJob(jobId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (payment) => {
        this.paymentId = payment.id;
        this.paymentStatus = {
          status: payment.status,
          completed: payment.status === 'Completed'
        };
        this.loadingPayment = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.paymentStatus = { status: 'Not Found', completed: false };
        this.paymentId = null;
        this.loadingPayment = false;
        this.cdr.markForCheck();
      }
    });
  }

  loadCompletionStatus(jobId: number): void {
    this.jobService.getJobCompletion(jobId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (completion) => {
        this.completionStatus = completion?.status ?? null;
        this.disputeReason = completion?.disputeReason ?? null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.completionStatus = null;
        this.disputeReason = null;
      }
    });
  }

  initiatePaymentForAssignedJob(): void {
    if (!this.job || !this.job.assignedProId) {
      this.errorMessage = 'Job not assigned to a professional.';
      return;
    }
    const acceptedBid = this.jobBids.find(bid => bid.status === 'Accepted');
    if (!acceptedBid || !acceptedBid.bidAmount) {
      this.errorMessage = 'Bid information not available for payment.';
      return;
    }
    this.openRazorpayCheckout(acceptedBid);
  }

  private openRazorpayCheckout(acceptedBid: JobBid): void {
    const paymentDialogRef = this.dialog.open(RazorpayCheckoutComponent, {
      width: '540px',
      maxHeight: '90vh',
      panelClass: 'rzp-dialog-panel',
      data: {
        jobId: this.job!.id,
        bidId: acceptedBid.id,
        bidAmount: acceptedBid.bidAmount,
        jobTitle: this.job!.title,
        consumerName: this.auth.getName() || 'User',
        consumerEmail: this.job!.user?.email || '',
        consumerPhone: this.job!.user?.phoneNumber || ''
      }
    });

    paymentDialogRef.afterClosed().subscribe(result => {
      if (result?.success) {
        this.successMessage = 'Payment completed successfully!';
        this.paymentStatus = { status: 'Completed', completed: true };
        this.cdr.markForCheck();
        setTimeout(() => { this.successMessage = ''; this.cdr.markForCheck(); }, 3000);
      } else if (result?.error) {
        this.errorMessage = result.error;
        setTimeout(() => { this.errorMessage = ''; this.cdr.markForCheck(); }, 3000);
      }
    });
  }

  acceptBid(jobId: number, bid: JobBid): void {
    const dialogRef = this.dialog.open(BidConfirmationDialogComponent, {
      width: '400px',
      data: { action: 'accept', bidAmount: bid.bidAmount, businessName: bid.pro?.businessName }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.jobService.acceptBid(jobId, bid.id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.successMessage = 'Bid accepted successfully!';
            setTimeout(() => {
              this.successMessage = '';
              this.cdr.markForCheck();
            }, 3000);
            this.loadJobDetails(jobId);
            
            // Open message dialog after successful acceptance
            setTimeout(() => {
              this.openMessageDialogForBid(bid);
            }, 500);
          },
          error: (error) => {
            console.error('Error accepting bid:', error);
            this.errorMessage = 'Failed to accept bid.';
            setTimeout(() => {
              this.errorMessage = '';
              this.cdr.markForCheck();
            }, 3000);
          }
        });
      }
    });
  }

  rejectBid(jobId: number, bid: JobBid): void {
    const dialogRef = this.dialog.open(BidConfirmationDialogComponent, {
      width: '400px',
      data: { action: 'reject', bidAmount: bid.bidAmount, businessName: bid.pro?.businessName }
    });

    dialogRef.afterClosed().subscribe((result: boolean | { confirmed: boolean; reason: string }) => {
      const confirmed = result === true || (typeof result === 'object' && result?.confirmed);
      const reason = typeof result === 'object' ? result.reason : undefined;
      if (confirmed) {
        this.jobService.rejectBid(jobId, bid.id, reason).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.successMessage = 'Bid rejected successfully!';
            setTimeout(() => {
              this.successMessage = '';
              this.cdr.markForCheck();
            }, 3000);
            this.loadJobDetails(jobId);
            
            // Open message dialog after successful rejection
            setTimeout(() => {
              this.openMessageDialogForBid(bid);
            }, 500);
          },
          error: (error) => {
            console.error('Error rejecting bid:', error);
            this.errorMessage = 'Failed to reject bid.';
            setTimeout(() => {
              this.errorMessage = '';
              this.cdr.markForCheck();
            }, 3000);
          }
        });
      }
    });
  }

  // Get phase progress percentage
  getJobPhaseProgress(job: Job): number {
    const phases = this.getJobPhases(job);
    if (phases.length === 0) return 0;
    const completed = phases.filter(p => p.isCompleted).length;
    return Math.round((completed / phases.length) * 100);
  }

  // Parse phases from job
  getJobPhases(job: Job): JobPhase[] {
    if (!job || !job.jobPhases) {
      return [];
    }
    
    // If it's already an array, return it
    if (Array.isArray(job.jobPhases)) {
      return job.jobPhases;
    }
    
    // If it's a string, parse it
    if (typeof job.jobPhases === 'string') {
      try {
        const parsed = JSON.parse(job.jobPhases);
        // Map PascalCase to camelCase
        return (Array.isArray(parsed) ? parsed : []).map((phase: any) => ({
          id: phase.id || phase.Id || '',
          title: phase.title || phase.Title || '',
          description: phase.description || phase.Description || '',
          isCompleted: phase.isCompleted !== undefined ? phase.isCompleted : phase.IsCompleted || false,
          completedAt: phase.completedAt || phase.CompletedAt
        }));
      } catch (e) {
        console.error('Failed to parse jobPhases:', e);
        return [];
      }
    }
    
    return [];
  }

  // Get the bid from the assigned professional
  getAssignedBid(): JobBid | null {
    if (!this.job || !this.job.assignedProId) {
      return null;
    }
    
    // Find the accepted bid from the assigned professional
    const assignedBid = this.jobBids.find(bid => 
      bid.proId === this.job!.assignedProId && bid.status === 'Accepted'
    );
    
    return assignedBid || null;
  }

  // Load messages for a job

  // Navigate to messages page with partner ID
  goToMessagesPage(): void {
    if (!this.job || !this.job.assignedProId) return;

    this.router.navigate(['/messages'], {
      queryParams: { 
        partnerId: this.job.assignedProId.toString()
      }
    });
  }

  // Send message to a bid professional
  messageBidProfessional(bid: JobBid): void {
    if (!this.job || !bid.proId) return;

    // If message exchange already happened, redirect to messages page
    if (bid.isMessageExchange) {
      this.router.navigate(['/messages'], {
        queryParams: { 
          partnerId: bid.proId.toString()
        }
      });
      return;
    }

    // First time messaging - open dialog to compose message
    const dialogRef = this.dialog.open(BidMessageDialogComponent, {
      width: '500px',
      data: {
        jobTitle: this.job.title,
        professionalName: bid.pro?.businessName || 'Professional',
        bidId: bid.id
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.message) {
        // Use the new bid-specific endpoint
        this.jobService.sendMessageToBid(bid.id, { content: result.message })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              // Mark isMessageExchange as true locally
              bid.isMessageExchange = true;
              
              this.successMessage = 'Message sent successfully!';
              setTimeout(() => {
                this.successMessage = '';
                this.cdr.markForCheck();
              }, 3000);

              // Redirect to messages page after short delay
              setTimeout(() => {
                this.router.navigate(['/messages'], {
                  queryParams: { 
                    partnerId: bid.proId!.toString()
                  }
                });
              }, 500);
            },
            error: (error) => {
              console.error('Error sending message:', error);
              this.errorMessage = 'Failed to send message.';
              setTimeout(() => {
                this.errorMessage = '';
                this.cdr.markForCheck();
              }, 3000);
            }
          });
      }
    });
  }

  verifyCompletion(): void {
    if (!this.job) return;
    const jobId = this.job.id;

    const dialogRef = this.dialog.open(VerifyCompletionDialogComponent, { width: '420px' });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.jobService.verifyJobCompletion(jobId).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.successMessage = 'Work confirmed! The job is now marked as Completed.';
          if (this.job) { this.job.status = 'Completed'; this.loadReview(jobId); }
          this.cdr.markForCheck();
          setTimeout(() => { this.successMessage = ''; this.cdr.markForCheck(); }, 4000);
        },
        error: () => {
          this.errorMessage = 'Failed to verify completion. Please try again.';
          setTimeout(() => { this.errorMessage = ''; this.cdr.markForCheck(); }, 4000);
        }
      });
    });
  }

  loadReview(jobId: number): void {
    this.loadingReview = true;
    this.reviewService.getJobReview(jobId).subscribe({
      next: (r) => { this.existingReview = r; this.loadingReview = false; this.cdr.markForCheck(); },
      error: () => { this.existingReview = null; this.loadingReview = false; this.cdr.markForCheck(); }
    });
  }

  openReviewDialog(): void {
    if (!this.job) return;
    const jobId = this.job.id;
    this.dialog.open(SubmitReviewDialogComponent, { width: '480px' })
      .afterClosed().subscribe((result: { rating: number; comment?: string } | undefined) => {
        if (!result) return;
        this.reviewService.submitReview(jobId, result.rating, result.comment)
          .pipe(takeUntil(this.destroy$)).subscribe({
            next: (r) => {
              this.existingReview = r;
              this.successMessage = 'Thank you for your review!';
              this.cdr.markForCheck();
              setTimeout(() => { this.successMessage = ''; this.cdr.markForCheck(); }, 4000);
            },
            error: (err) => {
              this.errorMessage = err?.error?.message ?? 'Failed to submit review.';
              setTimeout(() => { this.errorMessage = ''; this.cdr.markForCheck(); }, 4000);
            }
          });
      });
  }

  disputeCompletion(): void {
    if (!this.job) return;
    const jobId = this.job.id;

    const dialogRef = this.dialog.open(DisputeCompletionDialogComponent, { width: '480px' });
    dialogRef.afterClosed().subscribe((reason: string | undefined) => {
      if (!reason) return;
      this.jobService.disputeJobCompletion(jobId, reason).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.completionStatus = 'Disputed';
          this.disputeReason = reason;
          this.successMessage = 'Dispute raised. Our team will review and get back to you.';
          this.cdr.markForCheck();
          setTimeout(() => { this.successMessage = ''; this.cdr.markForCheck(); }, 5000);
        },
        error: () => {
          this.errorMessage = 'Failed to raise dispute. Please try again.';
          setTimeout(() => { this.errorMessage = ''; this.cdr.markForCheck(); }, 4000);
        }
      });
    });
  }

  requestRefund(): void {
    if (!this.paymentId) return;

    if (!confirm('Request a refund for this job? The payment will be returned to your account. This cannot be undone.')) return;

    this.requestingRefund = true;
    this.errorMessage = '';

    this.paymentService.requestRefund(this.paymentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = 'Refund requested successfully. The payment will be returned to your account.';
          if (this.paymentStatus) {
            this.paymentStatus = { status: 'Refunded', completed: false };
          }
          this.requestingRefund = false;
          this.cdr.markForCheck();
          setTimeout(() => { this.successMessage = ''; this.cdr.markForCheck(); }, 6000);
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to process refund. Please contact support.';
          this.requestingRefund = false;
          this.cdr.markForCheck();
          setTimeout(() => { this.errorMessage = ''; this.cdr.markForCheck(); }, 5000);
        }
      });
  }

  // Open message dialog for a bid after accept/reject
  openMessageDialogForBid(bid: JobBid): void {
    if (!this.job || !bid.proId) return;

    const dialogRef = this.dialog.open(BidActionMessageDialogComponent, {
      width: '500px',
      data: {
        jobTitle: this.job.title,
        professionalName: bid.pro?.businessName || 'Professional',
        bidId: bid.id
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.message) {
        // Send message using bid-specific endpoint
        this.jobService.sendMessageToBid(bid.id, { content: result.message })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.successMessage = 'Message sent successfully!';
              setTimeout(() => {
                this.successMessage = '';
                this.cdr.markForCheck();
              }, 3000);
            },
            error: (error) => {
              console.error('Error sending message:', error);
              this.errorMessage = 'Failed to send message.';
              setTimeout(() => {
                this.errorMessage = '';
                this.cdr.markForCheck();
              }, 3000);
            }
          });
      }
    });
  }
}

// Bid Message Dialog Component
@Component({
  selector: 'app-bid-message-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, MatFormFieldModule, MatInputModule, FormsModule],
  template: `
    <div class="bid-message-dialog">
      <h2 mat-dialog-title>Send Message to {{ data.professionalName }}</h2>
      
      <mat-dialog-content>
        <p class="dialog-subtitle">Job: {{ data.jobTitle }}</p>
        
        <mat-form-field appearance="outline" class="message-field">
          <mat-label>Your Message</mat-label>
          <textarea matInput 
            [(ngModel)]="message" 
            placeholder="Type your message here..."
            rows="5"></textarea>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          <mat-icon>close</mat-icon>
          Cancel
        </button>
        <button mat-raised-button color="accent" (click)="onSend()" [disabled]="!message.trim()">
          <mat-icon>send</mat-icon>
          Send Message
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .bid-message-dialog {
      min-width: 400px;
    }

    .dialog-subtitle {
      margin: 0 0 16px 0;
      color: #666;
      font-size: 0.9rem;
    }

    .message-field {
      width: 100%;
      margin-bottom: 16px;
    }

    mat-dialog-actions {
      gap: 8px;
    }
  `]
})
export class BidMessageDialogComponent {
  message = '';

  constructor(
    public dialogRef: MatDialogRef<BidMessageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onSend(): void {
    if (this.message.trim()) {
      this.dialogRef.close({ message: this.message });
    }
  }
}

// Bid Confirmation Dialog Component
@Component({
  selector: 'app-bid-confirmation-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, MatFormFieldModule, MatInputModule, FormsModule],
  template: `
    <div class="bid-confirmation-dialog">
      <div class="dialog-header">
        <mat-icon class="dialog-icon" [class.accept]="data.action === 'accept'" [class.reject]="data.action === 'reject'">
          {{ data.action === 'accept' ? 'check_circle' : 'cancel' }}
        </mat-icon>
        <h2 mat-dialog-title>
          {{ data.action === 'accept' ? 'Accept Bid' : 'Reject Bid' }}
        </h2>
      </div>

      <mat-dialog-content>
        <div class="bid-info">
          <p class="business-name"><strong>{{ data.businessName }}</strong></p>
          <p *ngIf="data.bidAmount" class="bid-amount">
            Bid Amount: <strong>{{ '\$' + (data.bidAmount | number: '1.2-2') }}</strong>
          </p>
          <p class="confirmation-message">
            {{ data.action === 'accept'
              ? 'Are you sure you want to accept this bid? ' + data.businessName + ' will be assigned to this job.'
              : 'Are you sure you want to reject this bid? This action cannot be undone.' }}
          </p>
        </div>
        <mat-form-field *ngIf="data.action === 'reject'" appearance="outline" class="reason-field">
          <mat-label>Reason for rejection (optional)</mat-label>
          <textarea matInput [(ngModel)]="reason" placeholder="Let the professional know why you're declining..." rows="3" maxlength="500"></textarea>
          <mat-hint align="end">{{ reason.length }}/500</mat-hint>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">
          <mat-icon>close</mat-icon>
          Cancel
        </button>
        <button mat-raised-button
          [color]="data.action === 'accept' ? 'accent' : 'warn'"
          (click)="onConfirm()">
          <mat-icon>{{ data.action === 'accept' ? 'check' : 'block' }}</mat-icon>
          {{ data.action === 'accept' ? 'Accept' : 'Reject' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .bid-confirmation-dialog {
      min-width: 320px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .dialog-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;

      &.accept {
        color: #4caf50;
      }

      &.reject {
        color: #f44336;
      }
    }

    mat-dialog-content {
      padding: 16px 0;
    }

    .bid-info {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .business-name {
      margin: 0 0 8px 0;
      font-size: 16px;
    }

    .bid-amount {
      margin: 0 0 12px 0;
      color: #666;
      font-size: 14px;
    }

    .confirmation-message {
      margin: 0 0 16px 0;
      color: #555;
      line-height: 1.5;
    }

    .reason-field {
      width: 100%;
    }

    mat-dialog-actions {
      gap: 8px;
    }
  `]
})
export class BidConfirmationDialogComponent {
  reason = '';

  constructor(
    public dialogRef: MatDialogRef<BidConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(this.data.action === 'reject' ? { confirmed: true, reason: this.reason.trim() } : true);
  }
}

// Bid Action Message Dialog Component - shown after accept/reject
@Component({
  selector: 'app-bid-action-message-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, MatFormFieldModule, MatInputModule, FormsModule],
  template: `
    <div class="bid-action-message-dialog">
      <h2 mat-dialog-title>Message {{ data.professionalName }}</h2>
      
      <mat-dialog-content>
        <p class="dialog-subtitle">Job: {{ data.jobTitle }}</p>
        <p class="dialog-hint">You can send an optional message to the professional:</p>
        
        <mat-form-field appearance="outline" class="message-field">
          <mat-label>Your Message (Optional)</mat-label>
          <textarea matInput 
            [(ngModel)]="message" 
            placeholder="Type your message here..."
            rows="5"></textarea>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="onSkip()">
          <mat-icon>close</mat-icon>
          Skip
        </button>
        <button mat-raised-button color="accent" (click)="onSend()">
          <mat-icon>send</mat-icon>
          Send Message
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .bid-action-message-dialog {
      min-width: 400px;
    }

    .dialog-subtitle {
      margin: 0 0 8px 0;
      color: #666;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .dialog-hint {
      margin: 0 0 16px 0;
      color: #999;
      font-size: 0.85rem;
    }

    .message-field {
      width: 100%;
      margin-bottom: 16px;
    }

    mat-dialog-actions {
      gap: 8px;
    }
  `]
})
export class BidActionMessageDialogComponent {
  message = '';

  constructor(
    public dialogRef: MatDialogRef<BidActionMessageDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onSkip(): void {
    this.dialogRef.close();
  }

  onSend(): void {
    if (this.message.trim()) {
      this.dialogRef.close({ message: this.message });
    } else {
      this.dialogRef.close();
    }
  }
}

// Verify Completion Dialog
@Component({
  selector: 'app-verify-completion-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div style="padding: 8px">
      <h2 mat-dialog-title>Confirm Work Completed</h2>
      <mat-dialog-content>
        <p>Are you satisfied with the work done by the professional?</p>
        <p style="color:#666;font-size:.9rem">Confirming releases the job as <strong>Completed</strong>. This action cannot be undone.</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end" style="gap:8px">
        <button mat-button (click)="close(false)">Cancel</button>
        <button mat-raised-button color="accent" (click)="close(true)">
          <mat-icon>check_circle</mat-icon> Yes, Confirm
        </button>
      </mat-dialog-actions>
    </div>
  `
})
export class VerifyCompletionDialogComponent {
  constructor(public dialogRef: MatDialogRef<VerifyCompletionDialogComponent>) {}
  close(result: boolean): void { this.dialogRef.close(result); }
}

// Dispute Completion Dialog
@Component({
  selector: 'app-dispute-completion-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule, MatFormFieldModule, MatInputModule, FormsModule],
  template: `
    <div style="padding: 8px">
      <h2 mat-dialog-title>Raise a Dispute</h2>
      <mat-dialog-content>
        <p style="color:#666;font-size:.9rem;margin-bottom:16px">Describe the issue with the work submitted. Our team will review and mediate.</p>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Reason for dispute</mat-label>
          <textarea matInput [(ngModel)]="reason" rows="4" placeholder="e.g. Work was not completed as agreed..."></textarea>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end" style="gap:8px">
        <button mat-button (click)="close()">Cancel</button>
        <button mat-raised-button color="warn" (click)="submit()" [disabled]="!reason.trim()">
          <mat-icon>flag</mat-icon> Submit Dispute
        </button>
      </mat-dialog-actions>
    </div>
  `
})
export class DisputeCompletionDialogComponent {
  reason = '';
  constructor(public dialogRef: MatDialogRef<DisputeCompletionDialogComponent>) {}
  close(): void { this.dialogRef.close(); }
  submit(): void { if (this.reason.trim()) this.dialogRef.close(this.reason); }
}




@Component({
  selector: 'app-submit-review-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <div style="padding:8px">
      <h2 mat-dialog-title>Leave a Review</h2>
      <mat-dialog-content>
        <p style="color:#666;font-size:.9rem;margin-bottom:16px">Rate your experience with this professional.</p>
        <div class="star-row" style="display:flex;gap:8px;margin-bottom:20px">
          <button *ngFor="let s of [1,2,3,4,5]" mat-icon-button type="button"
                  (click)="setRating(s)" [style.color]="s <= hovered || s <= rating ? '#f59e0b' : '#ccc'"
                  (mouseenter)="hovered=s" (mouseleave)="hovered=0">
            <mat-icon>star</mat-icon>
          </button>
          <span style="margin-left:8px;font-weight:600;align-self:center">{{ rating > 0 ? rating + ' / 5' : 'Select rating' }}</span>
        </div>
        <mat-form-field appearance="outline" style="width:100%">
          <mat-label>Comment (optional)</mat-label>
          <textarea matInput [(ngModel)]="comment" [ngModelOptions]="{standalone:true}" rows="3" placeholder="Share your experience..."></textarea>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end" style="gap:8px">
        <button mat-button (click)="dialogRef.close()">Cancel</button>
        <button mat-raised-button color="primary" (click)="submit()" [disabled]="rating === 0">
          <mat-icon>send</mat-icon> Submit Review
        </button>
      </mat-dialog-actions>
    </div>
  `
})
export class SubmitReviewDialogComponent {
  rating = 0;
  hovered = 0;
  comment = '';
  constructor(public dialogRef: MatDialogRef<SubmitReviewDialogComponent>) {}
  setRating(s: number): void { this.rating = s; }
  submit(): void { if (this.rating > 0) this.dialogRef.close({ rating: this.rating, comment: this.comment || undefined }); }
}

