import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { JobService, Job, JobPhase } from '../../services/job.service';
import { Auth } from '../../core/services/auth';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-my-jobs-pro',
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
    MatExpansionModule,
    MatCheckboxModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatButtonToggleModule
  ],
  templateUrl: './my-jobs-pro.html',
  styleUrl: './my-jobs-pro.scss'
})
export class MyJobsProComponent implements OnInit, OnDestroy {
  assignedJobs: Job[] = [];
  filteredJobs: Job[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';
  selectedStatus: string = 'All';
  availableStatuses = ['All', 'In Progress', 'Pending Review', 'On Hold', 'Completed'];
  private destroy$ = new Subject<void>();

  constructor(
    private jobService: JobService,
    public auth: Auth,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Only load jobs if user is authenticated as Pro
    if (this.auth.isAuthenticated() && this.auth.getUserType() === 'Pro') {
      this.loadAssignedJobs();
    } else {
      this.errorMessage = 'Please login as a Professional to view your assigned jobs.';
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAssignedJobs(): void {
    this.loading = true;
    this.errorMessage = '';
    
    this.jobService.getAssignedJobs().pipe(takeUntil(this.destroy$)).subscribe({
      next: (jobs) => {
        this.assignedJobs = jobs;
        this.applyStatusFilter();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error loading assigned jobs:', error);
        
        let errorMsg = 'Failed to load your assigned jobs.';
        
        if (error.status === 0) {
          errorMsg = 'Connection error. Please ensure the API server is running on https://localhost:7042';
        } else if (error.status === 401) {
          errorMsg = 'Unauthorized. Please login again.';
        } else if (error.status === 403) {
          errorMsg = 'Access denied. You do not have permission to view these jobs.';
        } else if (error.status === 404) {
          errorMsg = 'No assigned jobs found.';
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

  viewJobDetails(jobId: number): void {
    this.router.navigate(['/my-jobs-pro', jobId]);
  }

  formatBudget(budget: string): string {
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
      case 'in progress':
        return 'warn';
      case 'completed':
        return 'primary';
      default:
        return '';
    }
  }

  markAsCompleted(jobId: number): void {
    if (confirm('Mark this job as completed?')) {
      this.jobService.markJobCompleted(jobId).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.successMessage = 'Job marked as completed!';
          const job = this.assignedJobs.find(j => j.id === jobId);
          if (job) {
            job.status = 'Completed';
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
  }

  // Get phase progress percentage
  getPhaseProgress(job: Job): number {
    const phases = this.getJobPhases(job);
    if (phases.length === 0) return 0;
    const completed = phases.filter(p => p.isCompleted).length;
    return Math.round((completed / phases.length) * 100);
  }

  // Parse phases from job
  getJobPhases(job: Job): JobPhase[] {
    if (!job.jobPhases) {
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

  applyStatusFilter(): void {
    if (this.selectedStatus === 'All') {
      this.filteredJobs = this.assignedJobs;
    } else {
      this.filteredJobs = this.assignedJobs.filter(job => job.status === this.selectedStatus);
    }
    this.cdr.markForCheck();
  }

  onStatusFilterChange(status: string): void {
    this.selectedStatus = status;
    this.applyStatusFilter();
  }
}