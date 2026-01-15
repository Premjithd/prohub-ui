import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MyServicesService } from '../../services/my-services.service';
import { ServiceCategoryService } from '../../core/services/service-category.service';
import { Auth } from '../../core/services/auth';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-edit-service',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, MatProgressSpinnerModule],
  templateUrl: './edit-service.html',
  styleUrls: ['./edit-service.scss']
})
export class EditServiceComponent implements OnInit, OnDestroy {
  serviceForm!: FormGroup;
  submitted = false;
  successMessage = '';
  errorMessage = '';
  loading = true;
  serviceId!: number;
  categories: any[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private myServicesService: MyServicesService,
    private serviceCategoryService: ServiceCategoryService,
    public auth: Auth,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated and is a Pro
    if (!this.auth.isAuthenticated() || this.auth.getUserType() !== 'Pro') {
      this.errorMessage = 'You must be logged in as a professional to edit services.';
      this.router.navigate(['/']);
      return;
    }

    // Load categories first
    this.loadCategories();

    // Get service ID from route parameters
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe({
      next: (params) => {
        this.serviceId = parseInt(params['id'], 10);
        if (!this.serviceId) {
          this.errorMessage = 'Invalid service ID.';
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }
        this.loadService();
      },
      error: () => {
        this.errorMessage = 'Unable to load service.';
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
    this.serviceCategoryService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories: any[]) => {
          this.categories = categories;
          console.log('Categories loaded:', this.categories);
        },
        error: (error: any) => {
          console.error('Error loading categories:', error);
          this.categories = [];
        }
      });
  }

  loadService(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.myServicesService.getService(this.serviceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (service) => {
          console.log('Service loaded:', service);
          this.initializeForm(service);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading service:', error);
          this.errorMessage = 'Failed to load service. Please try again.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  initializeForm(service: any): void {
    this.serviceForm = this.fb.group({
      name: [service.name, [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      description: [service.description, [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
      price: [service.price, [Validators.required, Validators.min(0.01), Validators.max(999999.99)]],
      serviceCategoryId: [service.serviceCategoryId || '', Validators.required],
      agreeToTerms: [true, Validators.required]
    });
  }

  get f() {
    return this.serviceForm.controls;
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    // Mark all fields as touched to show validation errors
    Object.keys(this.serviceForm.controls).forEach(key => {
      this.serviceForm.get(key)?.markAsTouched();
    });

    if (!this.f['agreeToTerms'].value) {
      this.errorMessage = 'You must agree to the Terms of Service to update a service.';
      this.submitted = false;
      this.cdr.markForCheck();
      return;
    }

    if (this.serviceForm.invalid) {
      this.errorMessage = 'Please fill in all required fields correctly and agree to the terms.';
      this.submitted = false;
      this.cdr.markForCheck();
      return;
    }

    // Set submitted to true only after all validations pass
    this.submitted = true;
    this.cdr.markForCheck();

    const proId = this.auth.getUserId();
    if (!proId) {
      this.errorMessage = 'Unable to identify your professional account. Please logout and login again.';
      this.submitted = false;
      this.cdr.markForCheck();
      return;
    }

    const serviceData = {
      id: this.serviceId,
      name: this.serviceForm.value.name,
      description: this.serviceForm.value.description,
      price: parseFloat(this.serviceForm.value.price),
      serviceCategoryId: this.serviceForm.value.serviceCategoryId ? parseInt(this.serviceForm.value.serviceCategoryId, 10) : null,
      proId: parseInt(proId, 10)
    };

    console.log('Updating Service:', serviceData);
    
    this.myServicesService.updateService(this.serviceId, serviceData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Service updated successfully:', response);
          this.successMessage = 'Your service has been updated successfully!';
          
          // Reset form after 2 seconds and redirect
          setTimeout(() => {
            this.router.navigate(['/my-services']);
          }, 2000);
        },
        error: (error) => {
          console.error('Error updating service:', error);
          this.errorMessage = error?.error?.message || 'Error updating service. Please try again.';
          this.submitted = false;
          this.cdr.markForCheck();
        }
      });
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
    this.serviceForm.reset();
    this.submitted = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.cdr.markForCheck();
  }
}
