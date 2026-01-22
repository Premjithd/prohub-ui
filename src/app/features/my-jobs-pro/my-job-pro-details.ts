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
import { JobService, Job, JobPhase, Message, JobBid } from '../../services/job.service.js';
import { Auth } from '../../core/services/auth';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

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
    MatTooltipModule
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
  private destroy$ = new Subject<void>();

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
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadJobDetails(jobId: number): void {
    this.loading = true;
    this.errorMessage = '';
    
    this.jobService.getJob(jobId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (job) => {
        this.job = job;
        this.initializePhases(job);
        this.loading = false;
        this.cdr.markForCheck();
        // Load bids for the job
        this.loadBidsForJob(jobId);
        // Load messages for the job
        this.loadMessagesForJob(jobId);
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
    
    // If no phases or empty array, initialize with defaults
    if (!phases || phases.length === 0) {
      phases = [
        { id: '1', title: 'Project Setup', description: 'Initial project setup and requirements review', isCompleted: false },
        { id: '2', title: 'Design & Planning', description: 'Design and planning phase', isCompleted: false },
        { id: '3', title: 'Implementation', description: 'Main implementation and development', isCompleted: false },
        { id: '4', title: 'Testing & Review', description: 'Testing and client review', isCompleted: false },
        { id: '5', title: 'Final Delivery', description: 'Final delivery and handover', isCompleted: false }
      ];
    }
    
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

  markAsCompleted(jobId: number): void {
    if (!this.job || this.job.id !== jobId) return;

    if (confirm('Mark this job as completed?')) {
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

  // Send message to customer
  sendMessageToCustomer(): void {
    if (!this.messageText.trim() || !this.job) {
      return;
    }

    this.messageSending = true;
    this.messageStatus = '';

    this.jobService.sendMessage(this.job.id, { content: this.messageText })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (message) => {
          this.messageSending = false;
          this.messageStatus = '✓ Sent';
          this.messageText = '';
          this.jobMessages.push(message);
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
}
