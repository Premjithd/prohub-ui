import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import { JobService, Job } from '../../services/job.service';
import { Auth } from '../../core/services/auth';
import { ServiceCategoryService } from '../../core/services/service-category.service';
import { ServiceCategory } from '../../core/models/service-category.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-available-jobs',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatProgressSpinnerModule, 
    MatIconModule, 
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSliderModule,
    MatChipsModule,
    MatExpansionModule,
    FormsModule
  ],
  templateUrl: './available-jobs.html',
  styleUrls: ['./available-jobs.scss']
})
export class AvailableJobsComponent implements OnInit, OnDestroy {
  jobs: Job[] = [];
  filteredJobs: Job[] = [];
  loading = true;
  errorMessage = '';
  private destroy$ = new Subject<void>();

  // Pagination
  page = 1;
  pageSize = 20;
  total = 0;
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }

  // Filters (category is server-side; budget is client-side within page)
  selectedCategoryId: number | null = null;
  budgetRange: [number, number] = [0, 50000];
  categories: ServiceCategory[] = [];

  constructor(
    private jobService: JobService,
    private auth: Auth,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private serviceCategoryService: ServiceCategoryService
  ) {}

  ngOnInit(): void {
    if (!this.auth.isAuthenticated() || this.auth.getUserType() !== 'Pro') {
      this.errorMessage = 'You must be logged in as a professional to view available jobs.';
      this.router.navigate(['/']);
      return;
    }
    this.serviceCategoryService.getCategories().pipe(takeUntil(this.destroy$)).subscribe({
      next: cats => { this.categories = cats; this.cdr.markForCheck(); }
    });
    this.loadAvailableJobs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAvailableJobs(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.jobService.getAvailableJobs(this.page, this.pageSize, this.selectedCategoryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          this.jobs = result.items;
          this.total = result.total;
          this.applyBudgetFilter();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading available jobs:', error);
          this.errorMessage = 'Failed to load available jobs. Please try again later.';
          this.jobs = [];
          this.total = 0;
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  applyBudgetFilter(): void {
    this.filteredJobs = this.jobs.filter(job => {
      const numericBudget = this.parseBudgetValue(job.budget);
      return numericBudget >= this.budgetRange[0] && numericBudget <= this.budgetRange[1];
    });
  }

  private parseBudgetValue(budget: any): number {
    if (!budget) return 0;
    const parsed = parseFloat(budget);
    if (!isNaN(parsed)) return parsed;
    
    if (typeof budget === 'string' && budget.includes('-')) {
      const parts = budget.split('-');
      return parseFloat(parts[0]) || 0;
    }
    return 0;
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadAvailableJobs();
  }

  onBudgetFilterChange(): void {
    this.applyBudgetFilter();
    this.cdr.markForCheck();
  }

  resetFilters(): void {
    this.selectedCategoryId = null;
    this.budgetRange = [0, 50000];
    this.page = 1;
    this.loadAvailableJobs();
  }

  prevPage(): void {
    if (this.page > 1) { this.page--; this.loadAvailableJobs(); }
  }

  nextPage(): void {
    if (this.page < this.totalPages) { this.page++; this.loadAvailableJobs(); }
  }

  formatPrice(price: any): string {
    if (!price) return 'Contact for price';
    if (typeof price === 'string') {
      const parsed = parseFloat(price);
      return isNaN(parsed) ? price : `₹${parsed.toLocaleString('en-IN')}`;
    }
    return `₹${parseFloat(price).toLocaleString('en-IN')}`;
  }

  getPriorityColor(priority: string): string {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'warn';
      case 'high':
        return '#ff5722';
      case 'medium':
        return 'accent';
      default:
        return '#9e9e9e';
    }
  }

  getPriorityIcon(priority: string): string {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 'priority_high';
      case 'high':
        return 'arrow_upward';
      case 'medium':
        return 'remove';
      default:
        return 'arrow_downward';
    }
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
