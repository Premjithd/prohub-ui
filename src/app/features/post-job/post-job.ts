import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { JobService } from '../../services/job.service';
import { ServiceCategoryService } from '../../core/services/service-category.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';

interface ServiceCategory {
  id?: string | number;
  name: string;
  icon?: string;
  serviceCount?: number;
}

@Component({
  selector: 'app-post-job',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './post-job.html',
  styleUrls: ['./post-job.scss']
})
export class PostJobComponent implements OnInit, OnDestroy {
  jobForm!: FormGroup;
  submitted = false;
  successMessage = '';
  errorMessage = '';
  currentStep = 1;
  private destroy$ = new Subject<void>();

  serviceCategories: ServiceCategory[] = [];
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
    private jobService: JobService,
    private serviceCategoryService: ServiceCategoryService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeForm(): void {
    this.jobForm = this.fb.group({
      // Step 1
      title: ['', [Validators.required, Validators.minLength(10)]],
      category: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(50)]],

      // Step 2
      location: ['', Validators.required],
      budget: ['', Validators.required],
      timeline: ['', Validators.required],

      // Step 3
      attachments: [''],
      agreeToTerms: [false, Validators.required]
    });
  }

  loadCategories(): void {
    this.categoriesLoading = true;
    this.cdr.detectChanges();
    this.serviceCategoryService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories) => {
          console.log('✅ Categories loaded for post-job:', categories);
          this.serviceCategories = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            icon: cat.icon || '📋',
            serviceCount: cat.serviceCount
          }));
          this.categoriesLoading = false;
          this.cdr.detectChanges();
          console.log('Categories display:', this.serviceCategories.length, 'items loaded');
        },
        error: (error) => {
          console.error('❌ Error loading categories:', error);
          this.categoriesLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  get f() {
    return this.jobForm.controls;
  }

  isStepValid(step: number): boolean {
    if (step === 1) {
      return this.f['title'].valid && this.f['category'].valid && this.f['description'].valid;
    } else if (step === 2) {
      return this.f['location'].valid && this.f['budget'].valid && this.f['timeline'].valid;
    } else if (step === 3) {
      return this.f['agreeToTerms'].valid;
    }
    return false;
  }

  nextStep(): void {
    // Mark all fields in current step as touched to show validation errors
    this.markStepFieldsAsTouched(this.currentStep);
    
    if (this.isStepValid(this.currentStep)) {
      this.currentStep++;
    } else {
      console.warn('Step validation failed', {
        step: this.currentStep,
        formStatus: this.jobForm.status,
        errors: this.getStepErrors(this.currentStep)
      });
    }
  }

  private markStepFieldsAsTouched(step: number): void {
    if (step === 1) {
      this.f['title'].markAsTouched();
      this.f['category'].markAsTouched();
      this.f['description'].markAsTouched();
    } else if (step === 2) {
      this.f['location'].markAsTouched();
      this.f['budget'].markAsTouched();
      this.f['timeline'].markAsTouched();
    } else if (step === 3) {
      this.f['agreeToTerms'].markAsTouched();
    }
  }

  private getStepErrors(step: number): any {
    if (step === 1) {
      return {
        title: this.f['title'].errors,
        category: this.f['category'].errors,
        description: this.f['description'].errors
      };
    } else if (step === 2) {
      return {
        location: this.f['location'].errors,
        budget: this.f['budget'].errors,
        timeline: this.f['timeline'].errors
      };
    } else if (step === 3) {
      return {
        agreeToTerms: this.f['agreeToTerms'].errors
      };
    }
    return {};
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
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

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    // Mark all fields as touched to show validation errors
    this.markStepFieldsAsTouched(1);
    this.markStepFieldsAsTouched(2);
    this.markStepFieldsAsTouched(3);

    // Explicitly check terms and conditions
    if (!this.f['agreeToTerms'].value) {
      this.errorMessage = 'You must agree to the Terms of Service to post a job.';
      this.f['agreeToTerms'].markAsTouched();
      this.submitted = false;
      return;
    }

    if (this.jobForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly and agree to the terms.';
      this.submitted = false;
      return;
    }

    // Set submitted to true only after all validations pass
    this.submitted = true;

    const jobData = {
      title: this.jobForm.value.title,
      category: this.jobForm.value.category,
      description: this.jobForm.value.description,
      location: this.jobForm.value.location,
      budget: this.jobForm.value.budget,
      timeline: this.jobForm.value.timeline,
      attachments: this.jobForm.value.attachments || ''
    };

    console.log('Posting Job:', jobData);
    
    this.jobService.createJob(jobData).subscribe({
      next: (response) => {
        console.log('Job posted successfully:', response);
        this.successMessage = 'Your job has been posted successfully! Professionals will start bidding on your job.';
        
        // Reset form after 2 seconds and redirect
        setTimeout(() => {
          this.jobForm.reset();
          this.submitted = false;
          this.currentStep = 1;
          this.router.navigate(['/jobs']);
        }, 2000);
      },
      error: (error) => {
        console.error('Error posting job:', error);
        this.errorMessage = error?.error?.message || 'Error posting job. Please try again.';
        this.submitted = false;
      }
    });
  }

  dismissMessage(type: 'success' | 'error'): void {
    if (type === 'success') {
      this.successMessage = '';
    } else {
      this.errorMessage = '';
    }
  }

  getCategoryName(categoryId: string | number): string {
    const category = this.serviceCategories.find(c => 
      c.id === categoryId || c.id?.toString() === categoryId?.toString()
    );
    return category ? category.name : '';
  }

  getBudgetLabel(budgetValue: string): string {
    const budget = this.budgetRanges.find(b => b.value === budgetValue);
    return budget ? budget.label : '';
  }

  getTimelineLabel(timelineValue: string): string {
    const timeline = this.timelineOptions.find(t => t.value === timelineValue);
    return timeline ? timeline.label : '';
  }
}
