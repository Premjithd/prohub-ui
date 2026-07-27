import { Component, OnInit, OnDestroy, AfterViewInit, Inject, PLATFORM_ID, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule, MatSnackBarRef } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { JobService } from '../../services/job.service';
import { ServiceCategoryService } from '../../core/services/service-category.service';
import { AddressService, AddressPrediction } from '../../core/services/address.service';
import { getHttpErrorMessage } from '../../core/utils/http-error';
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
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, MatIconModule, MatSnackBarModule, TranslateModule],
  templateUrl: './post-job.html',
  styleUrls: ['./post-job.scss']
})
export class PostJobComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('addressSearchInput') addressSearchInput?: ElementRef;

  /** PIN passed from the home hero (?pin=…) to seed the Service Location search box. */
  private pinPrefill = '';

  jobForm!: FormGroup;
  submitted = false;
  successMessage = '';
  errorMessage = '';
  private serviceAreaSnackRef: MatSnackBarRef<ServiceAreaNoticeComponent> | null = null;
  currentStep = 1;
  private destroy$ = new Subject<void>();

  serviceCategories: ServiceCategory[] = [];
  filteredCategories: ServiceCategory[] = [];
  categoriesLoading = true;
  categoriesError = false;

  /** Synonym keywords per category name (lowercase) to match a free-text job title. */
  private readonly categoryKeywords: Record<string, string[]> = {
    'plumbing': ['tap', 'faucet', 'leak', 'pipe', 'drain', 'water', 'sink', 'toilet', 'bathroom', 'flush', 'geyser', 'sewage', 'basin'],
    'electrical': ['wiring', 'socket', 'switch', 'light', 'fan', 'power', 'short circuit', 'mcb', 'inverter', 'electric', 'plug', 'bulb', 'wire'],
    'painting': ['paint', 'wall', 'primer', 'whitewash', 'distemper', 'texture', 'putty'],
    'cleaning': ['clean', 'sweep', 'mop', 'dust', 'sanitize', 'housekeeping', 'wash'],
    'ac & appliance repair': ['ac', 'air condition', 'fridge', 'refrigerator', 'washing machine', 'microwave', 'appliance', 'cooler', 'geyser'],
    'pest control': ['pest', 'cockroach', 'termite', 'ant', 'rodent', 'mosquito', 'bug', 'rat'],
    'gardening & landscaping': ['garden', 'lawn', 'plant', 'landscap', 'tree', 'grass', 'hedge'],
    'landscaping': ['garden', 'lawn', 'plant', 'landscap', 'tree', 'grass'],
    'masonry & tiling': ['tile', 'brick', 'cement', 'concrete', 'masonry', 'plaster', 'floor', 'grout'],
    'waterproofing': ['waterproof', 'seepage', 'damp', 'leak', 'terrace'],
    'bathroom renovation': ['bathroom', 'renovat', 'remodel', 'fixture', 'washroom'],
    'movers & packers': ['move', 'moving', 'shift', 'relocat', 'pack', 'transport', 'luggage'],
    'security & cctv': ['cctv', 'camera', 'security', 'alarm', 'surveillance'],
    'locksmith': ['lock', 'key', 'unlock', 'door lock'],
    'hair & beauty': ['hair', 'salon', 'beauty', 'makeup', 'facial', 'grooming', 'mehndi'],
    'massage & spa': ['massage', 'spa', 'therapy', 'relax'],
    'catering & cooking': ['cook', 'chef', 'catering', 'food', 'meal', 'kitchen'],
    'cooking': ['cook', 'chef', 'catering', 'food', 'meal'],
    'tutoring': ['tutor', 'teach', 'coaching', 'lesson', 'study', 'exam', 'homework'],
    'it support & repair': ['computer', 'laptop', 'pc', 'software', 'virus', 'network', 'wifi', 'router', 'internet'],
    'phone & laptop repair': ['phone', 'mobile', 'laptop', 'screen', 'battery', 'charging', 'display'],
    'photography & videography': ['photo', 'video', 'camera', 'shoot', 'wedding', 'event'],
    'vehicle repair & service': ['car', 'bike', 'vehicle', 'engine', 'service', 'motor', 'tyre', 'scooter'],
    'real estate & vastu': ['vastu', 'property', 'real estate', 'rent', 'flat', 'house'],
    'pet care': ['pet', 'dog', 'cat', 'grooming', 'walk', 'puppy'],
    'babysitting & childcare': ['baby', 'child', 'nanny', 'kids', 'toddler'],
    'yoga & fitness': ['yoga', 'fitness', 'gym', 'workout', 'trainer', 'exercise'],
    'music lessons': ['music', 'guitar', 'piano', 'singing', 'instrument', 'keyboard', 'violin'],
    'interior design': ['interior', 'design', 'decor', 'furnish'],
    'handyman': ['handyman', 'repair', 'fix', 'install', 'mount', 'assemble', 'hang'],
    'carpentry': ['carpenter', 'wood', 'furniture', 'door', 'cabinet', 'shelf', 'table', 'chair'],
  };

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
    const pin = qp.get('pin');
    if (pin) {
      this.jobForm.patchValue({ serviceAddressPIN: pin });
      this.pinPrefill = pin;
    }
    this.loadCategories();
    // Narrow the category grid to titles the user types.
    this.jobForm.get('title')!.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.applyCategoryFilter());
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

  ngAfterViewInit(): void {
    // Arriving from the home hero with a PIN: seed the Service Location search box
    // with it and surface matching address suggestions to pick from.
    if (this.pinPrefill && this.addressSearchInput && !this.f['serviceAddressCity'].value) {
      this.addressSearchInput.nativeElement.value = this.pinPrefill;
      this.addressSearch$.next(this.pinPrefill);
    }
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

  /** Show only categories relevant to the typed title (matched by name or synonym
   *  keywords). Empty title shows all; no matches falls back to all; the currently
   *  selected category is always kept visible. */
  applyCategoryFilter(): void {
    const title = (this.jobForm?.get('title')?.value || '').toLowerCase().trim();
    if (!title) {
      this.filteredCategories = this.serviceCategories;
      this.cdr.detectChanges();
      return;
    }
    let matches = this.serviceCategories.filter(c => this.categoryMatchesTitle(c, title));
    if (matches.length === 0) {
      matches = this.serviceCategories;
    } else {
      const selectedId = this.jobForm?.get('category')?.value;
      if (selectedId && !matches.some(c => c.id === selectedId)) {
        const sel = this.serviceCategories.find(c => c.id === selectedId);
        if (sel) matches = [sel, ...matches];
      }
    }
    this.filteredCategories = matches;
    this.cdr.detectChanges();
  }

  private categoryMatchesTitle(cat: ServiceCategory, title: string): boolean {
    const name = (cat.name || '').toLowerCase();
    const titleTokens = title.split(/[^a-z0-9]+/).filter(Boolean);
    // Direct: a significant category-name word shares a stem with a title word
    // (startsWith, min 3 chars — avoids "room" matching "bathroom", "a" matching anything).
    const nameTokens = name.split(/[^a-z0-9]+/).filter(t => t.length > 2 && t !== 'and');
    const longTitleTokens = titleTokens.filter(t => t.length > 2);
    if (nameTokens.some(nt => longTitleTokens.some(tt => tt === nt || tt.startsWith(nt) || nt.startsWith(tt)))) {
      return true;
    }
    // Synonym keywords — word-aware to avoid short-substring false positives ("ac" in "replace").
    return (this.categoryKeywords[name] || []).some(k =>
      k.includes(' ')
        ? title.includes(k)                                   // multi-word phrase
        : titleTokens.some(tt => tt === k || tt.startsWith(k) || (k.length > 3 && tt.includes(k)))
    );
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
          this.applyCategoryFilter();
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
      return this.f['title'].valid && this.f['category'].valid && this.f['description'].valid && this.f['serviceAddressCity'].valid;
    } else if (step === 2) {
      return this.f['budget'].valid && this.f['timeline'].valid;
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
      this.f['serviceAddressCity'].markAsTouched();
    } else if (step === 2) {
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
          this.errorMessage = getHttpErrorMessage(error, 'Error posting job. Please try again.');
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
