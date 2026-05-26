import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { JobService } from '../../services/job.service';
import { ServiceCategoryService } from '../../core/services/service-category.service';
import { AddressService, AddressPrediction } from '../../core/services/address.service';
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
  @ViewChild('addressSearchInput') addressSearchInput?: ElementRef;

  jobForm!: FormGroup;
  submitted = false;
  successMessage = '';
  errorMessage = '';
  currentStep = 1;
  private destroy$ = new Subject<void>();

  serviceCategories: ServiceCategory[] = [];
  categoriesLoading = true;

  // Address autofill state
  addressPredictions: AddressPrediction[] = [];
  showAddressList = false;
  addressLoading = false;
  private jobLatitude: number | null = null;
  private jobLongitude: number | null = null;

  budgetRanges = [
    { value: 'under-100',  label: 'Under ₹5,000',         icon: '💰',          estimatedBudget: 2500  },
    { value: '100-250',    label: '₹5,000 - ₹12,500',     icon: '💰💰',        estimatedBudget: 8750  },
    { value: '250-500',    label: '₹12,500 - ₹25,000',    icon: '💰💰💰',      estimatedBudget: 18750 },
    { value: '500-1000',   label: '₹25,000 - ₹50,000',    icon: '💰💰💰💰',    estimatedBudget: 37500 },
    { value: 'over-1000',  label: 'Over ₹50,000',         icon: '💰💰💰💰💰',  estimatedBudget: 75000 }
  ];

  timelineOptions = [
    { value: 'asap', label: 'ASAP (within 24 hours)', icon: '⚡', description: 'Urgent' },
    { value: '1-week', label: 'Within 1 week', icon: '📅', description: 'Soon' },
    { value: '1-month', label: 'Within 1 month', icon: '📆', description: 'Flexible' },
    { value: 'flexible', label: 'No specific deadline', icon: '🔄', description: 'Very flexible' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private jobService: JobService,
    private serviceCategoryService: ServiceCategoryService,
    private addressService: AddressService,
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

      // Step 2 — address (city required; others auto-filled)
      location: [''],
      serviceAddressHouse: [''],
      serviceAddressStreet1: [''],
      serviceAddressCity: ['', Validators.required],
      serviceAddressState: [''],
      serviceAddressCountry: [''],
      serviceAddressPIN: [''],
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
          this.serviceCategories = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            icon: cat.icon || '📋',
            serviceCount: cat.serviceCount
          }));
          this.categoriesLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.categoriesLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  get f() {
    return this.jobForm.controls;
  }

  // ── Address autofill ──────────────────────────────────────────────────────

  onAddressInput(event: any): void {
    const input = event.target.value;
    if (input && input.length >= 3) {
      this.addressLoading = true;
      this.addressService.getAddressPredictions(input).subscribe({
        next: (predictions) => {
          this.addressPredictions = predictions;
          this.showAddressList = predictions.length > 0;
          this.addressLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.addressLoading = false;
          this.addressPredictions = [];
        }
      });
    } else {
      this.showAddressList = false;
      this.addressPredictions = [];
    }
  }

  onAddressSelected(prediction: AddressPrediction): void {
    this.showAddressList = false;
    this.addressLoading = true;

    this.addressService.getAddressDetails(prediction.placeId).subscribe({
      next: (details) => {
        this.jobForm.patchValue({
          location: prediction.description,
          serviceAddressHouse: details.houseNameNumber,
          serviceAddressStreet1: details.street1,
          serviceAddressCity: details.city,
          serviceAddressState: details.state,
          serviceAddressCountry: details.country,
          serviceAddressPIN: details.zipPostalCode
        });
        this.jobLatitude = details.latitude ?? null;
        this.jobLongitude = details.longitude ?? null;
        if (this.addressSearchInput) {
          this.addressSearchInput.nativeElement.value = prediction.description;
        }
        this.addressLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.addressLoading = false; }
    });
  }

  clearAddress(): void {
    this.jobForm.patchValue({
      location: '',
      serviceAddressHouse: '',
      serviceAddressStreet1: '',
      serviceAddressCity: '',
      serviceAddressState: '',
      serviceAddressCountry: '',
      serviceAddressPIN: ''
    });
    this.jobLatitude = null;
    this.jobLongitude = null;
    if (this.addressSearchInput) {
      this.addressSearchInput.nativeElement.value = '';
    }
    this.cdr.markForCheck();
  }

  hideAddressList(): void {
    setTimeout(() => { this.showAddressList = false; }, 200);
  }

  // ── Step navigation ───────────────────────────────────────────────────────

  isStepValid(step: number): boolean {
    if (step === 1) {
      return this.f['title'].valid && this.f['category'].valid && this.f['description'].valid;
    } else if (step === 2) {
      return this.f['serviceAddressCity'].valid && this.f['budget'].valid && this.f['timeline'].valid;
    } else if (step === 3) {
      return this.f['agreeToTerms'].valid;
    }
    return false;
  }

  nextStep(): void {
    this.markStepFieldsAsTouched(this.currentStep);
    if (this.isStepValid(this.currentStep)) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) this.currentStep--;
  }

  private markStepFieldsAsTouched(step: number): void {
    if (step === 1) {
      this.f['title'].markAsTouched();
      this.f['category'].markAsTouched();
      this.f['description'].markAsTouched();
    } else if (step === 2) {
      this.f['serviceAddressCity'].markAsTouched();
      this.f['budget'].markAsTouched();
      this.f['timeline'].markAsTouched();
    } else if (step === 3) {
      this.f['agreeToTerms'].markAsTouched();
    }
  }

  // ── Form actions ──────────────────────────────────────────────────────────

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

    this.markStepFieldsAsTouched(1);
    this.markStepFieldsAsTouched(2);
    this.markStepFieldsAsTouched(3);

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

    this.submitted = true;

    const selectedRange = this.budgetRanges.find(r => r.value === this.jobForm.value.budget);
    const jobData = {
      title: this.jobForm.value.title,
      categoryId: this.jobForm.value.category,
      description: this.jobForm.value.description,
      location: this.jobForm.value.location || this.jobForm.value.serviceAddressCity,
      budget: this.jobForm.value.budget,
      estimatedBudget: selectedRange?.estimatedBudget,
      timeline: this.jobForm.value.timeline,
      attachments: this.jobForm.value.attachments || '',
      serviceAddressHouse: this.jobForm.value.serviceAddressHouse || null,
      serviceAddressStreet1: this.jobForm.value.serviceAddressStreet1 || null,
      serviceAddressCity: this.jobForm.value.serviceAddressCity,
      serviceAddressState: this.jobForm.value.serviceAddressState || null,
      serviceAddressCountry: this.jobForm.value.serviceAddressCountry || null,
      serviceAddressPIN: this.jobForm.value.serviceAddressPIN || null,
      latitude: this.jobLatitude,
      longitude: this.jobLongitude
    };

    this.jobService.createJob(jobData).subscribe({
      next: () => {
        this.successMessage = 'Your job has been posted successfully! Professionals will start bidding on your job.';
        setTimeout(() => {
          this.jobForm.reset();
          this.submitted = false;
          this.currentStep = 1;
          this.router.navigate(['/jobs']);
        }, 2000);
      },
      error: (error) => {
        if (error?.status === 401) {
          this.errorMessage = 'You must be logged in to post a job. Please login and try again.';
        } else if (error?.status === 403) {
          this.errorMessage = error?.error?.message || 'Please verify your email address before posting a job.';
        } else if (error?.status === 400) {
          this.errorMessage = error?.error?.message || 'Invalid job data. Please check your inputs.';
        } else {
          this.errorMessage = error?.error?.message || 'Error posting job. Please try again.';
        }
        this.submitted = false;
      }
    });
  }

  dismissMessage(type: 'success' | 'error'): void {
    if (type === 'success') this.successMessage = '';
    else this.errorMessage = '';
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

  getLocationSummary(): string {
    const city = this.f['serviceAddressCity'].value;
    const state = this.f['serviceAddressState'].value;
    const country = this.f['serviceAddressCountry'].value;
    return [city, state, country].filter(Boolean).join(', ');
  }
}
