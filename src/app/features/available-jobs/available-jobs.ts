import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { JobService, Job, AvailableJobsResult } from '../../services/job.service';
import { Auth } from '../../core/services/auth';
import { ServiceCategoryService } from '../../core/services/service-category.service';
import { ServiceCategory } from '../../core/models/service-category.model';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { MapViewComponent, MapMarker } from '../../shared/map-view/map-view';
import { TranslateModule } from '@ngx-translate/core';

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
    MatInputModule,
    MatSelectModule,
    MatSliderModule,
    MatChipsModule,
    MatExpansionModule,
    MatTooltipModule,
    FormsModule,
    MapViewComponent,
    TranslateModule
  ],
  templateUrl: './available-jobs.html',
  styleUrls: ['./available-jobs.scss']
})
export class AvailableJobsComponent implements OnInit, OnDestroy {
  jobs: Job[] = [];
  filteredJobs: Job[] = [];
  loading = true;
  errorMessage = '';
  showMap = true;
  mapMarkers: MapMarker[] = [];
  highlightedJobId: number | null = null;
  private destroy$ = new Subject<void>();

  @ViewChild(MapViewComponent) mapView?: MapViewComponent;

  // Pagination
  page = 1;
  pageSize = 20;
  total = 0;
  get totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }

  // Filters — category & search are server-side; budget is client-side within current page
  selectedCategoryId: number | null = null;
  searchText = '';
  minBudget: number | null = null;
  maxBudget: number | null = null;
  categories: ServiceCategory[] = [];
  private search$ = new Subject<string>();

  // Proximity radius filter (null = all jobs)
  selectedRadiusKm: number | null = null;
  proximityFilterApplied = false;
  proLocationSet = false;
  activeRadiusKm: number | null = null;
  readonly radiusOptions: Array<{ label: string; value: number | null }> = [
    { label: 'All', value: null },
    { label: '5 km', value: 5 },
    { label: '15 km', value: 15 },
    { label: '25 km', value: 25 },
    { label: '50 km', value: 50 },
    { label: '100 km', value: 100 }
  ];

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

    // Debounce search input — fires API call 400ms after user stops typing
    this.search$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.page = 1;
      this.loadAvailableJobs();
    });

    this.loadAvailableJobs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.search$.complete();
  }

  loadAvailableJobs(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.jobService.getAvailableJobs(this.page, this.pageSize, this.selectedCategoryId, this.selectedRadiusKm, this.searchText.trim() || undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: AvailableJobsResult) => {
          this.jobs = result.items;
          this.total = result.total;
          this.proximityFilterApplied = result.proximityFilterApplied;
          this.proLocationSet = result.proLocationSet;
          this.activeRadiusKm = result.radiusKm;
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

  toggleMap(): void {
    this.showMap = !this.showMap;
    this.cdr.markForCheck();
  }

  hoverJob(id: number | null): void {
    this.highlightedJobId = id;
    this.cdr.markForCheck();
  }

  onMapMarkerClick(id: number): void {
    this.highlightedJobId = id;
    this.cdr.markForCheck();
    const el = document.getElementById(`job-card-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  private buildMapMarkers(): void {
    this.mapMarkers = this.filteredJobs
      .filter(j => j.latitude != null && j.longitude != null)
      .map(j => ({
        id: j.id,
        lat: j.latitude!,
        lng: j.longitude!,
        title: j.title,
        subtitle: [j.serviceAddressCity, j.serviceAddressState].filter(Boolean).join(', ') || j.location,
        type: 'job' as const
      }));
  }

  applyBudgetFilter(): void {
    this.filteredJobs = this.jobs.filter(job => {
      const v = this.parseBudgetValue(job.budget);
      if (this.minBudget != null && v < this.minBudget) return false;
      if (this.maxBudget != null && v > this.maxBudget) return false;
      return true;
    });
    this.buildMapMarkers();
  }

  private parseBudgetValue(budget: any): number {
    if (!budget) return 0;
    const parsed = parseFloat(budget);
    if (!isNaN(parsed)) return parsed;
    if (typeof budget === 'string' && budget.includes('-')) {
      return parseFloat(budget.split('-')[0]) || 0;
    }
    return 0;
  }

  onSearchChange(): void {
    this.search$.next(this.searchText);
  }

  onFilterChange(): void {
    this.page = 1;
    this.loadAvailableJobs();
  }

  onBudgetFilterChange(): void {
    this.applyBudgetFilter();
    this.cdr.markForCheck();
  }

  selectRadius(value: number | null): void {
    this.selectedRadiusKm = value;
    this.page = 1;
    this.loadAvailableJobs();
  }

  resetFilters(): void {
    this.selectedCategoryId = null;
    this.searchText = '';
    this.minBudget = null;
    this.maxBudget = null;
    this.selectedRadiusKm = null;
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
