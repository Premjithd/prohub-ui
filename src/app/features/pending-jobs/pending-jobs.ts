import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { JobService, Job, JobBid } from '../../services/job.service';
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
    MatExpansionModule
  ],
  templateUrl: './pending-jobs.html',
  styleUrl: './pending-jobs.scss'
})
export class PendingJobsComponent implements OnInit, OnDestroy {
  pendingJobs: Job[] = [];
  jobBidsMap: Map<number, JobBid[]> = new Map();
  loadingBidsMap: Map<number, boolean> = new Map();
  loading = true;
  errorMessage = '';
  successMessage = '';
  private destroy$ = new Subject<void>();

  constructor(private jobService: JobService, public auth: Auth, private cdr: ChangeDetectorRef, private router: Router) {}

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
        // Filter jobs with status "Open" (pending)
        this.pendingJobs = jobs.filter(job => job.status.toLowerCase() === 'open');
        console.log('Pending jobs filtered:', this.pendingJobs);
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
    if (confirm('Are you sure you want to delete this job?')) {
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
    // Prevent loading the same bids multiple times
    if (this.jobBidsMap.has(jobId)) {
      return;
    }

    this.loadingBidsMap.set(jobId, true);
    this.jobService.getJobBids(jobId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (bids) => {
        console.log(`Bids loaded for job ${jobId}:`, bids);
        this.jobBidsMap.set(jobId, bids);
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

  getProName(bid: JobBid): string {
    if (bid.pro?.firstName && bid.pro?.lastName) {
      return `${bid.pro.firstName} ${bid.pro.lastName}`;
    }
    return bid.pro?.name || 'Professional';
  }

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
}
