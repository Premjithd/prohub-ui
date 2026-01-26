import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
import { FormsModule } from '@angular/forms';
import { JobService, Job, JobBid, JobPhase, Message } from '../../services/job.service.js';
import { Auth } from '../../core/services/auth';
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
    FormsModule
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
  messageText: string = '';
  messageSending = false;
  messageStatus: string = '';
  selectedTabIndex = 0; // Track selected tab: 0 = Messages (default), 1 = Bid Details
  private destroy$ = new Subject<void>();
  private pollMessages$ = new Subject<void>(); // Subject to control polling
  private currentJobId: number | null = null;
  private messagePollInterval = 5000; // 5 seconds

  constructor(
    private jobService: JobService,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    public auth: Auth,
    private cdr: ChangeDetectorRef
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
        // Load messages for the job
        this.loadMessagesForJob(jobId);
        // Start message polling
        this.setupMessagePolling(jobId);
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

  getStatusColor(status: string): string {
    switch (status) {
      case 'Open':
        return 'primary';
      case 'In Progress':
        return 'accent';
      case 'Completed':
        return 'warn';
      default:
        return '';
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
      default:
        return 'Unknown';
    }
  }

  acceptBid(jobId: number, bid: JobBid): void {
    if (!confirm('Are you sure you want to accept this bid?')) {
      return;
    }

    this.jobService.acceptBid(jobId, bid.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.successMessage = 'Bid accepted successfully!';
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.markForCheck();
        }, 3000);
        this.loadJobDetails(jobId);
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

  rejectBid(jobId: number, bid: JobBid): void {
    if (!confirm('Are you sure you want to reject this bid?')) {
      return;
    }

    this.jobService.rejectBid(jobId, bid.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.successMessage = 'Bid rejected successfully!';
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.markForCheck();
        }, 3000);
        this.loadJobDetails(jobId);
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
  loadMessagesForJob(jobId: number): void {
    this.loadingMessages = true;

    this.jobService.getJobMessages(jobId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (messages) => {
        this.jobMessages = messages;
        this.loadingMessages = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading messages:', error);
        this.jobMessages = [];
        this.loadingMessages = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Send message to assigned professional
  sendMessageToAssignedPro(): void {
    if (!this.messageText.trim() || !this.job) {
      return;
    }

    this.messageSending = true;
    this.messageStatus = '';

    this.jobService.sendMessage(this.job.id, { content: this.messageText })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (messages) => {
          this.messageSending = false;
          this.messageStatus = '✓ Sent';
          this.messageText = '';
          this.jobMessages = messages;
          this.cdr.markForCheck();

          // Clear status message after 2 seconds
          setTimeout(() => {
            this.messageStatus = '';
            this.cdr.markForCheck();
          }, 2000);
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.messageSending = false;
          this.messageStatus = '✗ Failed to send';
          this.cdr.markForCheck();

          // Clear status message after 3 seconds
          setTimeout(() => {
            this.messageStatus = '';
            this.cdr.markForCheck();
          }, 3000);
        }
      });
  }

  // Get reversed messages for display (newest on top)
  getReversedMessages(): Message[] {
    return [...this.jobMessages].reverse();
  }

  // Handle tab change
  onTabChanged(index: number): void {
    this.selectedTabIndex = index;
    
    // Start polling when Messages tab (index 0) is selected
    if (index === 0 && this.currentJobId) {
      this.setupMessagePolling(this.currentJobId);
    } else {
      // Stop polling when switching to other tabs
      this.pollMessages$.next();
    }
    
    this.cdr.markForCheck();
  }

  // Setup polling for messages
  private setupMessagePolling(jobId: number): void {
    // Start polling with 5-second interval when Messages tab is active and job is not completed
    interval(this.messagePollInterval)
      .pipe(
        filter(() => this.selectedTabIndex === 0 && this.job?.status !== 'Completed'), // Only poll when Messages tab is active and job is not completed
        switchMap(() => this.jobService.getJobMessages(jobId)),
        takeUntil(this.pollMessages$),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (messages) => {
          this.jobMessages = messages;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error polling messages:', error);
        }
      });
  }
}


