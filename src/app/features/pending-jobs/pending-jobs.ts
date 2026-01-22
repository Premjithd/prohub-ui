import { Component, OnInit, ChangeDetectorRef, OnDestroy, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule, MatExpansionPanel } from '@angular/material/expansion';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { JobService, Job, JobBid, JobPhase } from '../../services/job.service';
import { Auth } from '../../core/services/auth';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-pending-jobs',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatExpansionModule,
    MatDialogModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatButtonToggleModule
  ],
  templateUrl: './pending-jobs.html',
  styleUrl: './pending-jobs.scss'
})
export class PendingJobsComponent implements OnInit, OnDestroy {
  @ViewChildren(MatExpansionPanel) expansionPanels?: QueryList<MatExpansionPanel>;
  
  allPendingJobs: Job[] = [];
  pendingJobs: Job[] = [];
  jobBidsMap: Map<number, JobBid[]> = new Map();
  loadingBidsMap: Map<number, boolean> = new Map();
  acceptedBidMap: Map<number, JobBid> = new Map();
  openBidsJobId: number | null = null;
  loading = true;
  errorMessage = '';
  successMessage = '';
  assignedProMap: Map<number, { name: string; email: string }> = new Map();
  
  // Filter properties
  statusFilters = ['All', 'Open', 'In Progress', 'Completed'];
  selectedStatusFilter: string = 'All';
  
  private destroy$ = new Subject<void>();

  constructor(private jobService: JobService, public auth: Auth, private cdr: ChangeDetectorRef, private router: Router, private dialog: MatDialog) {}

  ngOnInit(): void {
    // Only load jobs if user is authenticated
    if (this.auth.isAuthenticated()) {
      this.loadPendingJobs();
    } else {
      this.errorMessage = 'Please login to view your pending jobs.';
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPendingJobs(): void {
    this.loading = true;
    this.errorMessage = '';
    console.log('Loading pending jobs for user...');
    console.log('Auth token:', this.auth.getToken());
    
    this.jobService.getMyJobs().pipe(takeUntil(this.destroy$)).subscribe({
      next: (jobs) => {
        console.log('Jobs loaded successfully:', jobs);
        // Filter jobs with status "Open", "In Progress", or "Completed" to show user's jobs
        this.allPendingJobs = jobs.filter(job => 
          job.status.toLowerCase() === 'open' || 
          job.status.toLowerCase() === 'in progress' ||
          job.status.toLowerCase() === 'completed'
        );
        // Build map of assigned pros for jobs with "In Progress" status
        this.allPendingJobs.forEach(job => {
          if (job.status.toLowerCase() === 'in progress' && job.assignedPro) {
            const proName = job.assignedPro.firstName && job.assignedPro.lastName
              ? `${job.assignedPro.firstName} ${job.assignedPro.lastName}`
              : (job.assignedPro.name || 'Professional');
            this.assignedProMap.set(job.id, {
              name: proName,
              email: job.assignedPro.email || ''
            });
            // Load bids for in-progress jobs to find accepted bid
            this.loadBidsForJob(job.id);
          }
        });
        console.log('All pending jobs loaded:', this.allPendingJobs);
        // Apply initial filters
        this.applyFilters();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading pending jobs:', error);
        
        let errorMsg = 'Failed to load your pending jobs.';
        
        if (error.status === 0) {
          errorMsg = 'Connection error. Please ensure the API server is running on https://localhost:7042';
        } else if (error.status === 401) {
          errorMsg = 'Unauthorized. Please login again.';
        } else if (error.status === 403) {
          errorMsg = 'Access denied. You do not have permission to view these jobs.';
        } else if (error.status === 404) {
          errorMsg = 'No jobs found.';
        } else if (error.status === 500) {
          errorMsg = 'Server error. Please try again later.';
        } else if (error.message) {
          errorMsg = error.message;
        }
        
        this.errorMessage = errorMsg;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  deleteJob(jobId: number): void {
    const dialogRef = this.dialog.open(DeleteConfirmDialogComponent, {
      width: '400px',
      data: { jobTitle: 'this job' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.jobService.deleteJob(jobId).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.successMessage = 'Job deleted successfully!';
            this.pendingJobs = this.pendingJobs.filter(job => job.id !== jobId);
            this.cdr.markForCheck();
            setTimeout(() => {
              this.successMessage = '';
              this.cdr.markForCheck();
            }, 3000);
          },
          error: (error) => {
            console.error('Error deleting job:', error);
            this.errorMessage = 'Failed to delete the job. Please try again.';
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  editJob(jobId: number): void {
    this.router.navigate(['/edit-job', jobId]);
  }

  formatBudget(budget: string): string {
    // Parse budget range and format for display
    const budgetMap: { [key: string]: string } = {
      'under-100': 'Under $100',
      '100-250': '$100 - $250',
      '250-500': '$250 - $500',
      '500-1000': '$500 - $1,000',
      'over-1000': 'Over $1,000'
    };
    return budgetMap[budget] || budget;
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
    switch (status.toLowerCase()) {
      case 'open':
        return 'accent';
      case 'assigned':
        return 'warn';
      case 'completed':
        return 'primary';
      default:
        return '';
    }
  }

  loadBidsForJob(jobId: number): void {
    // Set this job as the open one
    this.openBidsJobId = jobId;

    // Prevent loading the same bids multiple times
    if (this.jobBidsMap.has(jobId)) {
      // Still extract accepted bid if not already done
      this.extractAcceptedBid(jobId);
      return;
    }

    this.loadingBidsMap.set(jobId, true);
    this.jobService.getJobBids(jobId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (bids) => {
        console.log(`Bids loaded for job ${jobId}:`, bids);
        this.jobBidsMap.set(jobId, bids);
        this.extractAcceptedBid(jobId);
        this.loadingBidsMap.set(jobId, false);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error(`Error loading bids for job ${jobId}:`, error);
        this.jobBidsMap.set(jobId, []);
        this.loadingBidsMap.set(jobId, false);
        this.cdr.markForCheck();
      }
    });
  }

  extractAcceptedBid(jobId: number): void {
    const bids = this.jobBidsMap.get(jobId);
    if (bids && bids.length > 0) {
      const acceptedBid = bids.find(bid => bid.status === 'Accepted');
      if (acceptedBid) {
        this.acceptedBidMap.set(jobId, acceptedBid);
      }
    }
  }

  onBidsExpandedChange(jobId: number, isExpanded: boolean): void {
    if (isExpanded) {
      // Close all other panels
      if (this.expansionPanels) {
        this.expansionPanels.forEach((panel, index) => {
          // Close all panels except the current job's panel
          if (index !== this.pendingJobs.findIndex(j => j.id === jobId)) {
            panel.close();
          }
        });
      }
      this.openBidsJobId = jobId;
      this.loadBidsForJob(jobId);
    } else if (this.openBidsJobId === jobId) {
      this.openBidsJobId = null;
    }
  }

  // getProName(bid: JobBid): string {
  //   if (bid.pro?.proName) {
  //     return bid.pro.proName;
  //   }
  //   return 'Professional';
  // }

  getBidStatus(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Pending Review';
      case 'accepted':
        return 'Accepted';
      case 'rejected':
        return 'Rejected';
      case 'withdrawn':
        return 'Withdrawn';
      default:
        return status;
    }
  }

  getBidStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'warn';
      case 'accepted':
        return 'accent';
      case 'rejected':
        return 'primary';
      case 'withdrawn':
        return 'primary';
      default:
        return '';
    }
  }

  acceptBid(jobId: number, bid: JobBid): void {
    const dialogRef = this.dialog.open(BidConfirmDialogComponent, {
      width: '420px',
      data: { 
        action: 'accept',
        proName: bid.pro?.proName || 'Professional',
        bidAmount: bid.bidAmount || 'Not specified'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.jobService.acceptBid(jobId, bid.id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.successMessage = 'Bid accepted successfully!';
            bid.status = 'Accepted';
            this.cdr.markForCheck();
            setTimeout(() => {
              this.successMessage = '';
              this.cdr.markForCheck();
            }, 3000);
          },
          error: (error) => {
            console.error('Error accepting bid:', error);
            this.errorMessage = 'Failed to accept bid. Please try again.';
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  rejectBid(jobId: number, bid: JobBid): void {
    const dialogRef = this.dialog.open(BidConfirmDialogComponent, {
      width: '420px',
      data: { 
        action: 'reject',
        proName: bid.pro?.proName || 'Professional'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.jobService.rejectBid(jobId, bid.id).pipe(takeUntil(this.destroy$)).subscribe({
          next: () => {
            this.successMessage = 'Bid rejected successfully!';
            bid.status = 'Rejected';
            this.cdr.markForCheck();
            setTimeout(() => {
              this.successMessage = '';
              this.cdr.markForCheck();
            }, 3000);
          },
          error: (error) => {
            console.error('Error rejecting bid:', error);
            this.errorMessage = 'Failed to reject bid. Please try again.';
            this.cdr.markForCheck();
          }
        });
      }
    });
  }

  // Get job phases from job
  getJobPhases(job: Job): JobPhase[] {
    if (!job.jobPhases) return [];
    
    let phases: JobPhase[] = [];
    
    if (typeof job.jobPhases === 'string') {
      try {
        phases = JSON.parse(job.jobPhases);
      } catch (e) {
        return [];
      }
    } else if (Array.isArray(job.jobPhases)) {
      phases = job.jobPhases;
    } else {
      return [];
    }

    // Map PascalCase properties from backend to camelCase for TypeScript
    return phases.map((phase: any) => ({
      id: phase.id || phase.Id || '',
      title: phase.title || phase.Title || '',
      description: phase.description || phase.Description || '',
      isCompleted: phase.isCompleted !== undefined ? phase.isCompleted : phase.IsCompleted || false,
      completedAt: phase.completedAt || phase.CompletedAt
    }));
  }

  // Get phase progress percentage for a job
  getJobPhaseProgress(job: Job): number {
    const phases = this.getJobPhases(job);
    if (phases.length === 0) return 0;
    const completed = phases.filter(p => p.isCompleted).length;
    return Math.round((completed / phases.length) * 100);
  }

  applyFilters(): void {
    if (this.selectedStatusFilter === 'All') {
      this.pendingJobs = this.allPendingJobs;
    } else {
      this.pendingJobs = this.allPendingJobs.filter(job => {
        return job.status === this.selectedStatusFilter;
      });
    }
    this.cdr.markForCheck();
  }

  onFilterChange(status: string): void {
    this.selectedStatusFilter = status;
    this.applyFilters();
  }

  viewJobDetails(jobId: number): void {
    this.router.navigate(['/pending-jobs', jobId]);
  }

  getActiveFilterCount(): number {
    return 1;
  }

  sendMessageToPro(jobId: number, message: string, messageInput: any): void {
    if (!message.trim()) {
      this.errorMessage = 'Please enter a message before sending.';
      setTimeout(() => {
        this.errorMessage = '';
        this.cdr.markForCheck();
      }, 3000);
      return;
    }

    // For now, we'll just show a success message
    // In a real app, this would send the message via an API
    this.successMessage = 'Message sent to professional successfully!';
    messageInput.value = '';
    this.cdr.markForCheck();
    setTimeout(() => {
      this.successMessage = '';
      this.cdr.markForCheck();
    }, 3000);
  }
}

// Delete Confirmation Dialog Component
import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-delete-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="delete-dialog-container">
      <div class="dialog-icon-wrapper">
        <mat-icon class="warning-icon">delete_outline</mat-icon>
      </div>
      <h2 mat-dialog-title class="dialog-title">Delete Job?</h2>
      <mat-dialog-content class="dialog-content">
        <p class="confirmation-message">
          Are you sure you want to delete <strong class="job-title">{{ data.jobTitle }}</strong>?
        </p>
        <p class="warning-message">
          <mat-icon class="inline-icon">info</mat-icon>
          This action cannot be undone.
        </p>
      </mat-dialog-content>
      <mat-dialog-actions class="dialog-actions">
        <button 
          mat-stroked-button 
          class="cancel-btn"
          (click)="onCancel()">
          <mat-icon>close</mat-icon>
          Cancel
        </button>
        <button 
          mat-raised-button 
          color="warn" 
          class="delete-btn"
          (click)="onConfirm()">
          <mat-icon>delete</mat-icon>
          Delete Job
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .delete-dialog-container {
      padding: 24px;
      text-align: center;
      min-width: 320px;
    }

    .dialog-icon-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
      animation: scaleIn 0.3s ease-out;
    }

    .warning-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
      color: #ff6b6b;
      background: linear-gradient(135deg, rgba(255, 107, 107, 0.1), rgba(255, 107, 107, 0.05));
      border-radius: 50%;
      padding: 8px;
      box-sizing: border-box;
    }

    .dialog-title {
      margin: 16px 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: #212121;
      letter-spacing: 0.25px;
    }

    .dialog-content {
      padding: 16px 0 24px 0;
      margin: 0 !important;
    }

    .confirmation-message {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #424242;
      line-height: 1.6;
      font-weight: 500;
    }

    .job-title {
      color: #1976d2;
      word-break: break-word;
    }

    .warning-message {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin: 12px 0 0 0;
      padding: 8px 12px;
      background: linear-gradient(135deg, rgba(255, 152, 0, 0.08), rgba(255, 152, 0, 0.04));
      border-radius: 6px;
      font-size: 13px;
      color: #f57c00;
      font-weight: 500;
    }

    .inline-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      padding: 0 !important;
      margin: 0 !important;
    }

    .cancel-btn {
      min-width: 120px;
      padding: 8px 24px !important;
      color: #424242;
      border: 1.5px solid #e0e0e0 !important;
      transition: all 0.3s ease;

      &:hover {
        background-color: #f5f5f5;
        border-color: #bdbdbd !important;
      }

      mat-icon {
        margin-right: 8px;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .delete-btn {
      min-width: 120px;
      padding: 8px 24px !important;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3) !important;
      transition: all 0.3s ease;

      &:hover {
        box-shadow: 0 6px 16px rgba(244, 67, 54, 0.4) !important;
        transform: translateY(-2px);
      }

      mat-icon {
        margin-right: 8px;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    @keyframes scaleIn {
      from {
        transform: scale(0.8);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }

    @media (max-width: 480px) {
      .delete-dialog-container {
        min-width: 280px;
        padding: 20px;
      }

      .dialog-actions {
        flex-direction: column;
        gap: 8px;
      }

      .cancel-btn,
      .delete-btn {
        width: 100%;
        min-width: auto;
      }
    }
  `]
})
export class DeleteConfirmDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private dialogRef: MatDialogRef<DeleteConfirmDialogComponent>) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}

// Bid Confirmation Dialog Component
@Component({
  selector: 'app-bid-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="bid-dialog-container">
      <div class="dialog-icon-wrapper" [ngClass]="data.action">
        <mat-icon class="action-icon" [ngClass]="data.action">
          {{ data.action === 'accept' ? 'check_circle' : 'cancel' }}
        </mat-icon>
      </div>
      <h2 mat-dialog-title class="dialog-title">
        {{ data.action === 'accept' ? 'Accept Bid?' : 'Reject Bid?' }}
      </h2>
      <mat-dialog-content class="dialog-content">
        <div class="bid-details">
          <p class="pro-info">
            <strong>Professional:</strong> {{ data.proName }}
          </p>
          <p *ngIf="data.action === 'accept'" class="bid-amount">
            <strong>Bid Amount:</strong> <span class="amount"><span>$</span>{{ data.bidAmount }}</span>
          </p>
        </div>
        <p class="confirmation-message" [ngClass]="data.action">
          <mat-icon class="inline-icon">{{ data.action === 'accept' ? 'info' : 'warning' }}</mat-icon>
          <span *ngIf="data.action === 'accept'">
            You're about to accept this bid. The professional will be assigned to this job.
          </span>
          <span *ngIf="data.action === 'reject'">
            This bid will be rejected and the professional will be notified.
          </span>
        </p>
      </mat-dialog-content>
      <mat-dialog-actions class="dialog-actions">
        <button 
          mat-stroked-button 
          class="cancel-btn"
          (click)="onCancel()">
          <mat-icon>close</mat-icon>
          Cancel
        </button>
        <button 
          mat-raised-button 
          [color]="data.action === 'accept' ? 'accent' : 'warn'"
          class="action-btn"
          (click)="onConfirm()">
          <mat-icon>{{ data.action === 'accept' ? 'check' : 'delete' }}</mat-icon>
          {{ data.action === 'accept' ? 'Accept Bid' : 'Reject Bid' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .bid-dialog-container {
      padding: 24px;
      min-width: 340px;
    }

    .dialog-icon-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
      animation: scaleIn 0.3s ease-out;

      &.accept .action-icon {
        font-size: 56px;
        width: 56px;
        height: 56px;
        color: #4caf50;
        background: linear-gradient(135deg, rgba(76, 175, 80, 0.1), rgba(76, 175, 80, 0.05));
        border-radius: 50%;
        padding: 8px;
        box-sizing: border-box;
      }

      &.reject .action-icon {
        font-size: 56px;
        width: 56px;
        height: 56px;
        color: #ff5252;
        background: linear-gradient(135deg, rgba(255, 82, 82, 0.1), rgba(255, 82, 82, 0.05));
        border-radius: 50%;
        padding: 8px;
        box-sizing: border-box;
      }
    }

    .dialog-title {
      margin: 16px 0 8px 0;
      font-size: 20px;
      font-weight: 600;
      color: #212121;
      text-align: center;
      letter-spacing: 0.25px;
    }

    .dialog-content {
      padding: 16px 0 24px 0;
      margin: 0 !important;
    }

    .bid-details {
      background: linear-gradient(135deg, rgba(33, 150, 243, 0.05), rgba(33, 150, 243, 0.02));
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 16px;
      border-left: 4px solid #2196f3;
    }

    .pro-info,
    .bid-amount {
      margin: 8px 0;
      font-size: 14px;
      color: #424242;

      strong {
        color: #1976d2;
        font-weight: 600;
      }
    }

    .bid-amount .amount {
      color: #4caf50;
      font-size: 16px;
      font-weight: 700;
    }

    .confirmation-message {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin: 12px 0 0 0;
      padding: 12px;
      border-radius: 6px;
      font-size: 13px;
      line-height: 1.6;
      font-weight: 500;

      &.accept {
        background: linear-gradient(135deg, rgba(76, 175, 80, 0.08), rgba(76, 175, 80, 0.04));
        color: #2e7d32;

        .inline-icon {
          color: #4caf50;
        }
      }

      &.reject {
        background: linear-gradient(135deg, rgba(255, 82, 82, 0.08), rgba(255, 82, 82, 0.04));
        color: #c62828;

        .inline-icon {
          color: #ff5252;
        }
      }
    }

    .inline-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      padding: 0 !important;
      margin: 0 !important;
    }

    .cancel-btn {
      min-width: 110px;
      padding: 8px 20px !important;
      color: #424242;
      border: 1.5px solid #e0e0e0 !important;
      transition: all 0.3s ease;

      &:hover {
        background-color: #f5f5f5;
        border-color: #bdbdbd !important;
      }

      mat-icon {
        margin-right: 6px;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    .action-btn {
      min-width: 130px;
      padding: 8px 20px !important;
      font-weight: 600;
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
      }

      mat-icon {
        margin-right: 6px;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }
    }

    @keyframes scaleIn {
      from {
        transform: scale(0.8);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }

    @media (max-width: 480px) {
      .bid-dialog-container {
        min-width: 300px;
        padding: 20px;
      }

      .dialog-actions {
        flex-direction: column;
        gap: 8px;
      }

      .cancel-btn,
      .action-btn {
        width: 100%;
        min-width: auto;
      }
    }
  `]
})
export class BidConfirmDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any, private dialogRef: MatDialogRef<BidConfirmDialogComponent>) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}