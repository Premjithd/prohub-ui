import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { JobService, Job } from '../../services/job.service';
import { Auth } from '../../core/services/auth';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-available-jobs',
  standalone: true,
  imports: [CommonModule, RouterModule, MatProgressSpinnerModule, MatIconModule, MatButtonModule],
  templateUrl: './available-jobs.html',
  styleUrls: ['./available-jobs.scss']
})
export class AvailableJobsComponent implements OnInit, OnDestroy {
  jobs: Job[] = [];
  loading = true;
  errorMessage = '';
  private destroy$ = new Subject<void>();

  constructor(
    private jobService: JobService,
    private auth: Auth,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated and is a Pro
    if (!this.auth.isAuthenticated() || this.auth.getUserType() !== 'Pro') {
      this.errorMessage = 'You must be logged in as a professional to view available jobs.';
      this.router.navigate(['/']);
      return;
    }
    this.loadAvailableJobs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAvailableJobs(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.jobService.getAvailableJobs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (jobs) => {
          console.log('Available jobs loaded:', jobs);
          this.jobs = jobs;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading available jobs:', error);
          this.errorMessage = 'Failed to load available jobs. Please try again later.';
          this.jobs = [];
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

  navigateTo(path: string): void {
    if (this.auth.isAuthenticated()) {
      this.router.navigate([path]);
    } else {
      this.router.navigate(['/auth/login']);
    }
  }

  viewJobDetails(jobId: number): void {
    this.router.navigate(['/job-details'], { queryParams: { id: jobId } });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
