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

  // Filters
  selectedCategory: string | null = null;
  selectedPriority: string | null = null;
  budgetRange: [number, number] = [0, 50000];
  sortBy: string = 'recent';
  categories: any[] = [];

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
          this.extractCategories();
          this.applyFilters();
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

  private extractCategories(): void {
    const categorySet = new Set<string>();
    this.jobs.forEach(job => {
      if (job.category?.name) {
        categorySet.add(job.category.name);
      }
    });
    this.categories = Array.from(categorySet).map(name => ({ name }));
  }

  applyFilters(): void {
    let filtered = [...this.jobs];

    // Filter by category
    if (this.selectedCategory) {
      filtered = filtered.filter(job => job.category?.name === this.selectedCategory);
    }

    // Filter by priority
    if (this.selectedPriority) {
      filtered = filtered.filter(job => job.priority === this.selectedPriority);
    }

    // Filter by budget range
    // Handle both numeric budgets and budget category strings like "under-100"
    filtered = filtered.filter(job => {
      const budgetValue = job.budget || '0';
      let numericBudget = 0;
      
      // Try to parse as number first
      const parsed = parseFloat(budgetValue);
      if (!isNaN(parsed)) {
        numericBudget = parsed;
      } else {
        // Handle budget categories like "under-100", "1000-5000", etc.
        if (budgetValue.includes('-')) {
          const parts = budgetValue.split('-');
          // Use the lower bound for comparison
          numericBudget = parseFloat(parts[0]) || 0;
        }
      }
      
      return numericBudget >= this.budgetRange[0] && numericBudget <= this.budgetRange[1];
    });

    // Sort
    switch (this.sortBy) {
      case 'recent':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'budget-low':
        filtered.sort((a, b) => {
          const budgetA = this.parseBudgetValue(a.budget);
          const budgetB = this.parseBudgetValue(b.budget);
          return budgetA - budgetB;
        });
        break;
      case 'budget-high':
        filtered.sort((a, b) => {
          const budgetA = this.parseBudgetValue(a.budget);
          const budgetB = this.parseBudgetValue(b.budget);
          return budgetB - budgetA;
        });
        break;
    }

    this.filteredJobs = filtered;
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
    this.applyFilters();
  }

  resetFilters(): void {
    this.selectedCategory = null;
    this.selectedPriority = null;
    this.budgetRange = [0, 50000];
    this.sortBy = 'recent';
    this.applyFilters();
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
