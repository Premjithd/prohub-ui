import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule, MatSnackBarRef } from '@angular/material/snack-bar';
import { JobService } from '../../services/job.service';
import { ServiceCategoryService } from '../../core/services/service-category.service';
import { AddressService, AddressPrediction } from '../../core/services/address.service';
import { Subject, of } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, MatIconModule, MatSnackBarModule],
  templateUrl: './post-job.html',
  styleUrls: ['./post-job.scss']
})
export class PostJobComponent implements OnInit, OnDestroy {
  @ViewChild('addressSearchInput') addressSearchInput?: ElementRef;

  jobForm!: FormGroup;
  submitted = false;
  successMessage = '';
  errorMessage = '';
  private serviceAreaSnackRef: MatSnackBarRef<ServiceAreaNoticeComponent> | null = null;
  currentStep = 1;
  private destroy$ = new Subject<void>();

  serviceCategories: ServiceCategory[] = [];
  categoriesLoading = true;
  categoriesError = false;

  // Address autofill state
  addressPredictions: AddressPrediction[] = [];
  showAddressList = false;
  addressLoading = false;
  private jobLatitude: number | null = null;
  private jobLongitude: number | null = null;
  private addressSearch$ = new Subject<string>();

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

  private preFillCategoryId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private jobService: JobService,
    private serviceCategoryService: ServiceCategoryService,
    private addressService: AddressService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    const qp = this.route.snapshot.queryParamMap;
    const catId = qp.get('categoryId');
    if (catId) this.preFillCategoryId = parseInt(catId, 10);
    const title = qp.get('title');
    if (title) this.jobForm.patchValue({ title });
    this.loadCategories();
    this.addressSearch$.pipe(
      debounceTime(450),
      distinctUntilChanged(),
      switchMap(input => {
        if (!input || input.length < 3) {
          this.addressLoading = false;
          this.addressPredictions = [];
          this.showAddressList = false;
          return of([]);
        }
        this.addressLoading = true;
        this.cdr.markForCheck();
        return this.addressService.getAddressPredictions(input).pipe(
          catchError(() => of([]))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe(predictions => {
      this.addressPredictions = predictions as AddressPrediction[];
      this.showAddressList = this.addressPredictions.length > 0;
      this.addressLoading = false;
      this.cdr.markForCheck();
    });
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
      serviceAddressDistrict: [''],
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
    this.categoriesError = false;
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
          if (this.preFillCategoryId) {
            const match = this.serviceCategories.find(c => c.id === this.preFillCategoryId);
            if (match) this.jobForm.patchValue({ category: match.id });
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.categoriesLoading = false;
          this.categoriesError = true;
          this.cdr.detectChanges();
        }
      });
  }

  get f() {
    return this.jobForm.controls;
  }

  // ── Address autofill ──────────────────────────────────────────────────────

  onAddressInput(event: any): void {
    this.addressSearch$.next(event.target.value ?? '');
  }

  onAddressSelected(prediction: AddressPrediction): void {
    this.showAddressList = false;

    // Address details are already bundled in the search result — no second API call needed
    const details = prediction.details;
    this.jobLatitude = prediction.latitude ?? null;
    this.jobLongitude = prediction.longitude ?? null;

    this.jobForm.patchValue({
      location: prediction.description,
      serviceAddressHouse: details?.houseNameNumber || '',
      serviceAddressStreet1: details?.street1 || '',
      serviceAddressCity: details?.city || prediction.mainText,
      serviceAddressDistrict: details?.district || '',
      serviceAddressState: details?.state || '',
      serviceAddressCountry: details?.country || '',
      serviceAddressPIN: details?.zipPostalCode || ''
    });
    if (this.addressSearchInput) {
      this.addressSearchInput.nativeElement.value = prediction.description;
    }
    this.cdr.markForCheck();
  }

  clearAddress(): void {
    this.jobForm.patchValue({
      location: '',
      serviceAddressHouse: '',
      serviceAddressStreet1: '',
      serviceAddressCity: '',
      serviceAddressDistrict: '',
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
    this.serviceAreaSnackRef?.dismiss();
    this.serviceAreaSnackRef = null;

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
      serviceAddressDistrict: this.jobForm.value.serviceAddressDistrict || null,
      serviceAddressState: this.jobForm.value.serviceAddressState || null,
      serviceAddressCountry: this.jobForm.value.serviceAddressCountry || null,
      serviceAddressPIN: this.jobForm.value.serviceAddressPIN || null,
      latitude: this.jobLatitude,
      longitude: this.jobLongitude
    };

    this.jobService.createJob(jobData).subscribe({
      next: () => {
        this.submitted = false;
        this.successMessage = 'Your job has been posted successfully! Professionals will start bidding on your job.';
        this.cdr.markForCheck();
        setTimeout(() => {
          this.jobForm.reset();
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
          const msg: string = error?.error?.message || '';
          if (msg.toLowerCase().includes('not serving')) {
            this.serviceAreaSnackRef = this.snackBar.openFromComponent(ServiceAreaNoticeComponent, {
              panelClass: 'snack-service-area',
              horizontalPosition: 'center',
              verticalPosition: 'bottom'
            });
          } else {
            this.errorMessage = msg || 'Invalid job data. Please check your inputs.';
          }
        } else {
          this.errorMessage = error?.error?.message || 'Error posting job. Please try again.';
        }
        this.submitted = false;
        this.cdr.markForCheck();
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

@Component({
  selector: 'app-service-area-notice',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="san-wrap">
      <mat-icon class="san-icon">location_on</mat-icon>
      <div class="san-body">
        <p class="san-title">Area Not Yet Covered</p>
        <p class="san-msg">We're not serving this area currently. We're expanding — check back soon!</p>
      </div>
      <button class="san-close" (click)="ref.dismiss()" aria-label="Dismiss">
        <mat-icon>close</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .san-wrap { display: flex; align-items: flex-start; gap: 0.875rem; }
    .san-icon { font-size: 1.75rem; width: 1.75rem; height: 1.75rem; color: #f57c00; flex-shrink: 0; margin-top: 0.1rem; }
    .san-body { flex: 1; }
    .san-title { margin: 0 0 0.25rem; font-size: 0.95rem; font-weight: 700; color: #e65100; }
    .san-msg { margin: 0; font-size: 0.84rem; color: #6d4c41; line-height: 1.5; }
    .san-close { background: none; border: none; cursor: pointer; color: #f57c00; opacity: 0.6; display: flex; align-items: center; flex-shrink: 0; padding: 0.1rem; border-radius: 4px; transition: opacity 0.15s; }
    .san-close:hover { opacity: 1; }
    .san-close mat-icon { font-size: 1.1rem; width: 1.1rem; height: 1.1rem; }
  `]
})
export class ServiceAreaNoticeComponent {
  constructor(public ref: MatSnackBarRef<ServiceAreaNoticeComponent>) {}
}
