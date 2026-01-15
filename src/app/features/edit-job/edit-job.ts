import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { JobService } from '../../services/job.service';
import { ServiceCategoryService } from '../../core/services/service-category.service';
import { Auth } from '../../core/services/auth';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-edit-job',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, MatProgressSpinnerModule],
  templateUrl: './edit-job.html',
  styleUrls: ['./edit-job.scss']
})
export class EditJobComponent implements OnInit, OnDestroy {
  jobForm!: FormGroup;
  submitted = false;
  successMessage = '';
  errorMessage = '';
  loading = true;
  jobId!: number;
  private destroy$ = new Subject<void>();

  serviceCategories: any[] = [];
  categoriesLoading = true;

  budgetRanges = [
    { value: 'under-100', label: 'Under $100', icon: '$' },
    { value: '100-250', label: '$100 - $250', icon: '$$' },
    { value: '250-500', label: '$250 - $500', icon: '$$$' },
    { value: '500-1000', label: '$500 - $1,000', icon: '$$$$' },
    { value: 'over-1000', label: 'Over $1,000', icon: '$$$$$' }
  ];

  timelineOptions = [
    { value: 'asap', label: 'ASAP (within 24 hours)', icon: '⚡', description: 'Urgent' },
    { value: '1-week', label: 'Within 1 week', icon: '📅', description: 'Soon' },
    { value: '1-month', label: 'Within 1 month', icon: '📆', description: 'Flexible' },
    { value: 'flexible', label: 'No specific deadline', icon: '🔄', description: 'Very flexible' }
  ];

  locationTypes = [
    { value: 'local', label: 'Local (In-person)', description: 'Work will be done at my location' },
    { value: 'remote', label: 'Remote', description: 'Work can be done remotely' },
    { value: 'both', label: 'Both (Local & Remote)', description: 'Either location works' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private jobService: JobService,
    private serviceCategoryService: ServiceCategoryService,
    public auth: Auth,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated
    if (!this.auth.isAuthenticated()) {
      this.errorMessage = 'You must be logged in to edit jobs.';
      this.router.navigate(['/']);
      return;
    }

    // Get job ID from route parameters
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe({
      next: (params) => {
        this.jobId = parseInt(params['id'], 10);
        if (!this.jobId) {
          this.errorMessage = 'Invalid job ID.';
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.loadCategories();
        this.loadJob();
      },
      error: () => {
        this.errorMessage = 'Unable to load job.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories(): void {
    this.categoriesLoading = true;
    this.cdr.detectChanges();
    this.serviceCategoryService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          console.log('✅ Categories loaded for edit-job:', categories);
          this.serviceCategories = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            icon: cat.icon || '📋',
            serviceCount: cat.serviceCount
          }));
          this.categoriesLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Error loading categories:', error);
          this.categoriesLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  loadJob(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.jobService.getJob(this.jobId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (job) => {
          console.log('Job loaded:', job);
          this.initializeForm(job);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading job:', error);
          this.errorMessage = 'Failed to load job. Please try again.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  initializeForm(job: any): void {
    this.jobForm = this.fb.group({
      title: [job.title, [Validators.required, Validators.minLength(10), Validators.maxLength(200)]],
      category: [job.category, Validators.required],
      description: [job.description, [Validators.required, Validators.minLength(50), Validators.maxLength(3000)]],
      location: [job.location, Validators.required],
      budget: [job.budget, Validators.required],
      timeline: [job.timeline, Validators.required],
      attachments: [job.attachments || ''],
      agreeToTerms: [true, Validators.required]
    });
  }

  get f() {
    return this.jobForm.controls;
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    // Mark all fields as touched to show validation errors
    Object.keys(this.jobForm.controls).forEach(key => {
      this.jobForm.get(key)?.markAsTouched();
    });

    if (!this.f['agreeToTerms'].value) {
      this.errorMessage = 'You must agree to the Terms of Service to update a job.';
      this.submitted = false;
      this.cdr.markForCheck();
      return;
    }

    if (this.jobForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly and agree to the terms.';
      this.submitted = false;
      this.cdr.markForCheck();
      return;
    }

    // Set submitted to true only after all validations pass
    this.submitted = true;
    this.cdr.markForCheck();

    const jobData = {
      id: this.jobId,
      title: this.jobForm.value.title,
      category: this.jobForm.value.category,
      description: this.jobForm.value.description,
      location: this.jobForm.value.location,
      budget: this.jobForm.value.budget,
      timeline: this.jobForm.value.timeline,
      attachments: this.jobForm.value.attachments || ''
    };

    console.log('Updating Job:', jobData);
    
    this.jobService.updateJob(this.jobId, jobData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Job updated successfully:', response);
          this.successMessage = 'Your job has been updated successfully!';
          
          // Reset form after 2 seconds and redirect
          setTimeout(() => {
            this.router.navigate(['/pending-jobs']);
          }, 2000);
        },
        error: (error) => {
          console.error('Error updating job:', error);
          this.errorMessage = error?.error?.message || 'Error updating job. Please try again.';
          this.submitted = false;
          this.cdr.markForCheck();
        }
      });
  }

  selectCategory(categoryId: string | number): void {
    this.jobForm.patchValue({ category: categoryId });
  }

  selectBudget(budgetValue: string): void {
    this.jobForm.patchValue({ budget: budgetValue });
  }

  selectTimeline(timelineValue: string): void {
    this.jobForm.patchValue({ timeline: timelineValue });
  }

  dismissMessage(type: 'success' | 'error'): void {
    if (type === 'success') {
      this.successMessage = '';
    } else {
      this.errorMessage = '';
    }
    this.cdr.markForCheck();
  }

  resetForm(): void {
    this.jobForm.reset();
    this.submitted = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();
  }
}
