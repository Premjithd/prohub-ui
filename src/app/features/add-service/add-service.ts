import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MyServicesService } from '../../services/my-services.service';
import { Auth } from '../../core/services/auth';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-add-service',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-service.html',
  styleUrls: ['./add-service.scss']
})
export class AddServiceComponent implements OnInit, OnDestroy {
  serviceForm!: FormGroup;
  submitted = false;
  successMessage = '';
  errorMessage = '';
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private myServicesService: MyServicesService,
    public auth: Auth,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Check if user is authenticated and is a Pro
    if (!this.auth.isAuthenticated() || this.auth.getUserType() !== 'Pro') {
      this.errorMessage = 'You must be logged in as a professional to add services.';
      this.router.navigate(['/']);
      return;
    }
    this.initializeForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initializeForm(): void {
    this.serviceForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
      price: ['', [Validators.required, Validators.min(0.01), Validators.max(999999.99)]],
      agreeToTerms: [false, Validators.required]
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
      this.errorMessage = 'You must agree to the Terms of Service to add a service.';
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
      name: this.serviceForm.value.name,
      description: this.serviceForm.value.description,
      price: parseFloat(this.serviceForm.value.price),
      proId: parseInt(proId, 10)
    };

    console.log('Adding Service:', serviceData);
    
    this.myServicesService.createService(serviceData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Service added successfully:', response);
          this.successMessage = 'Your service has been added successfully!';
          
          // Reset form after 2 seconds and redirect
          setTimeout(() => {
            this.serviceForm.reset();
            this.submitted = false;
            this.router.navigate(['/my-services']);
          }, 2000);
        },
        error: (error) => {
          console.error('Error adding service:', error);
          this.errorMessage = error?.error?.message || 'Error adding service. Please try again.';
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
