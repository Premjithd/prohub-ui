import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { JobService, Job } from '../../services/job.service';
import { Auth } from '../../core/services/auth';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BidSubmissionDialogComponent } from './bid-submission-dialog.component';

@Component({
  selector: 'app-job-details',
  standalone: true,
  imports: [CommonModule, RouterModule, MatProgressSpinnerModule, MatIconModule, MatButtonModule, MatSnackBarModule, MatDialogModule, MatInputModule, MatFormFieldModule, ReactiveFormsModule],
  templateUrl: './job-details.html',
  styleUrls: ['./job-details.scss']
})
export class JobDetailsComponent implements OnInit, OnDestroy {
  job: Job | null = null;
  loading = true;
  errorMessage = '';
  jobId!: number;
  submittingBid = false;
  bidSuccess = false;
  userHasBid = false;
  userBidMessage: string | null = null;
  userBidAmount: number | null = null;
  userBidStatus: string | null = null;
  jobMessages: any[] = [];
  loadingMessages = false;
  currentUserId!: number;
  private destroy$ = new Subject<void>();

  constructor(
    private jobService: JobService,
    private auth: Auth,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private dialog: MatDialog,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated and is a Pro
    if (!this.auth.isAuthenticated() || this.auth.getUserType() !== 'Pro') {
      this.errorMessage = 'You must be logged in as a professional to view job details.';
      this.router.navigate(['/']);
      return;
    }

    // Get current user ID and convert to number
    const userIdStr = this.auth.getUserId();
    if (userIdStr) {
      this.currentUserId = parseInt(userIdStr, 10);
    }

    // Get job ID from query params
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe({
      next: (params) => {
        this.jobId = parseInt(params['id'], 10);
        if (!this.jobId) {
          this.errorMessage = 'Invalid job ID.';
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.loadJobDetails();
      },
      error: () => {
        this.errorMessage = 'Unable to load job details.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadJobDetails(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.jobService.getJob(this.jobId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (job) => {
          console.log('Job details loaded:', job);
          this.job = job;
          this.checkIfUserHasBid(); // Check if current user has already bid
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading job details:', error);
          this.errorMessage = 'Failed to load job details. Please try again later.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  checkIfUserHasBid(): void {
    if (!this.job) return;

    this.jobService.getJobBids(this.jobId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (bids) => {
          // Check if current user has already bid and get their bid details
          const userBid = bids.find(bid => bid.proId === this.currentUserId);
          this.userHasBid = !!userBid;
          
          if (userBid) {
            this.userBidMessage = userBid.bidMessage || null;
            this.userBidAmount = userBid.bidAmount || null;
            this.userBidStatus = userBid.status || null;
            console.log(`User ${this.currentUserId} bid:`, { message: this.userBidMessage, amount: this.userBidAmount, status: this.userBidStatus });
            // Load messages related to this bid
            this.loadJobMessages();
          }
          
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error checking user bid status:', error);
          this.userHasBid = false;
          this.userBidMessage = null;
          this.userBidAmount = null;
          this.userBidStatus = null;
          this.cdr.markForCheck();
        }
      });
  }

  // Load messages for the job
  loadJobMessages(): void {
    this.loadingMessages = true;
    this.jobService.getJobMessages(this.jobId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          // Filter messages to only those related to the current pro user
          // Messages where recipientId matches current user or senderType is Pro
          this.jobMessages = messages.filter(msg => 
            msg.recipientId === this.currentUserId || 
            (msg.senderType === 'Pro' && msg.senderId === this.currentUserId) ||
            msg.senderType === 'User' // Show all messages from users (job posters)
          );
          this.loadingMessages = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading job messages:', error);
          this.jobMessages = [];
          this.loadingMessages = false;
          this.cdr.markForCheck();
        }
      });
  }

  formatPrice(price: any): string {
    if (!price) return 'Contact for price';
    if (typeof price === 'string') {
      // If it's already formatted like "100-500", return as is
      if (price.includes('-')) return `$${price}`;
      // Otherwise parse and format
      const parsed = parseFloat(price);
      return isNaN(parsed) ? price : `$${parsed.toFixed(2)}`;
    }
    return `$${parseFloat(price).toFixed(2)}`;
  }

  getPostedByName(): string {
    console.log('getPostedByName called, job:', this.job);
    
    if (!this.job) {
      console.log('Job is null/undefined');
      return 'User';
    }
    
    if (!this.job.user) {
      console.log('Job user is null/undefined');
      return 'User';
    }
    
    const user = this.job.user as any;
    console.log('User object:', user);
    
    // Try firstName and lastName first
    if (user.firstName && user.lastName) {
      const fullName = `${user.firstName} ${user.lastName}`;
      console.log('Returning full name:', fullName);
      return fullName;
    }
    
    // Try name property
    if (user.name) {
      console.log('Returning name:', user.name);
      return user.name;
    }
    
    // Try other common user properties
    if (user.displayName) {
      console.log('Returning displayName:', user.displayName);
      return user.displayName;
    }
    
    console.log('Returning default User');
    return 'User';
  }

  getAssignedProName(): string {
    if (!this.job?.assignedPro) return 'Professional';
    
    const pro = this.job.assignedPro as any;
    
    if (pro.firstName && pro.lastName) {
      return `${pro.firstName} ${pro.lastName}`;
    }
    
    if (pro.name) {
      return pro.name;
    }
    
    if (pro.displayName) {
      return pro.displayName;
    }
    
    return 'Professional';
  }

  goBack(): void {
    this.router.navigate(['/available-jobs']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }

  submitBid(): void {
    if (!this.job) {
      this.errorMessage = 'Job information not loaded';
      return;
    }

    if (this.userHasBid && this.userBidStatus !== 'Rejected') {
      this.errorMessage = 'You have already submitted a bid for this job.';
      return;
    }

    // Open bid submission dialog
    const dialogRef = this.dialog.open(BidSubmissionDialogComponent, {
      width: '500px',
      disableClose: false,
      data: {
        jobTitle: this.job.title,
        jobBudget: this.job.budget,
        isResubmission: this.userBidStatus === 'Rejected'
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.message !== undefined && result.amount !== undefined) {
        this.submitBidWithCustomData(result.message, result.amount);
      }
    });
  }

  submitBidWithCustomData(message: string, amount: number): void {
    if (!this.job) {
      this.errorMessage = 'Job information not loaded';
      return;
    }

    this.submittingBid = true;
    this.errorMessage = '';

    this.jobService.submitJobBid(this.job.id, {
      bidMessage: message,
      bidAmount: amount
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Bid submitted successfully:', response);
          this.bidSuccess = true;
          this.submittingBid = false;
          this.cdr.markForCheck();
          
          // Refresh bid status to show updated bid
          this.checkIfUserHasBid();
          
          // Show success message for 3 seconds
          setTimeout(() => {
            this.bidSuccess = false;
            this.cdr.markForCheck();
          }, 3000);
        },
        error: (error) => {
          console.error('Error submitting bid:', error);
          this.submittingBid = false;
          
          // Extract error message from response
          if (error.error && typeof error.error === 'object') {
            if (error.error.message) {
              this.errorMessage = error.error.message;
            } else if (error.error.error) {
              this.errorMessage = error.error.error;
            }
          } else if (error.message) {
            this.errorMessage = error.message;
          } else {
            this.errorMessage = 'Failed to submit your bid. Please try again.';
          }
          
          this.cdr.markForCheck();
        }
      });
  }
}
