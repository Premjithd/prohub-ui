import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { JobService, Job } from '../../services/job.service';
import { Auth } from '../../core/services/auth';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-job-details',
  standalone: true,
  imports: [CommonModule, RouterModule, MatProgressSpinnerModule, MatIconModule, MatButtonModule],
  templateUrl: './job-details.html',
  styleUrls: ['./job-details.scss']
})
export class JobDetailsComponent implements OnInit, OnDestroy {
  job: Job | null = null;
  loading = true;
  errorMessage = '';
  jobId!: number;
  private destroy$ = new Subject<void>();

  constructor(
    private jobService: JobService,
    private auth: Auth,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated and is a Pro
    if (!this.auth.isAuthenticated() || this.auth.getUserType() !== 'Pro') {
      this.errorMessage = 'You must be logged in as a professional to view job details.';
      this.router.navigate(['/']);
      return;
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

  goBack(): void {
    this.router.navigate(['/available-jobs']);
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
