import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MyServicesService, Service } from '../../services/my-services.service';
import { Auth } from '../../core/services/auth';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-my-services',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule
  ],
  templateUrl: './my-services.html',
  styleUrl: './my-services.scss'
})
export class MyServicesComponent implements OnInit, OnDestroy {
  services: Service[] = [];
  loading = true;
  errorMessage = '';
  successMessage = '';
  private destroy$ = new Subject<void>();

  constructor(
    private myServicesService: MyServicesService,
    public auth: Auth,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Only load services if user is authenticated and is a Pro
    if (this.auth.isAuthenticated() && this.auth.getUserType() === 'Pro') {
      this.loadMyServices();
    } else {
      this.errorMessage = 'Please login as a professional to view your services.';
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMyServices(): void {
    this.loading = true;
    this.errorMessage = '';
    console.log('Loading services for pro user...');
    
    // Get proId from auth service
    const proIdStr = this.auth.getUserId();
    if (!proIdStr) {
      this.errorMessage = 'Unable to identify professional account. Please logout and login again.';
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    const proId = parseInt(proIdStr, 10);
    console.log('Fetching services for Pro ID:', proId);
    
    this.myServicesService.getMyServices(proId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (services) => {
          console.log('Services received in component:', services);
          console.log('Services array length:', services.length);
          console.log('Services array is:', Array.isArray(services) ? 'an array' : 'not an array');
          if (services && services.length > 0) {
            console.log('First service:', services[0]);
          }
          this.services = services;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error loading services:', error);
          
          let errorMsg = 'Failed to load your services.';
          
          if (error.status === 0) {
            errorMsg = 'Connection error. Please ensure the API server is running on https://localhost:7042';
          } else if (error.status === 401) {
            errorMsg = 'Unauthorized. Please login again.';
          } else if (error.status === 403) {
            errorMsg = 'Access denied. You do not have permission to view these services.';
          } else if (error.status === 404) {
            errorMsg = 'No services found.';
          } else if (error.status === 500) {
            errorMsg = 'Server error. Please try again later.';
          } else if (error.message) {
            errorMsg = error.message;
          }
          
          this.errorMessage = errorMsg;
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  deleteService(serviceId: number): void {
    if (confirm('Are you sure you want to delete this service?')) {
      this.myServicesService.deleteService(serviceId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.successMessage = 'Service deleted successfully!';
            this.services = this.services.filter(service => service.id !== serviceId);
            this.cdr.markForCheck();
            setTimeout(() => {
              this.successMessage = '';
              this.cdr.markForCheck();
            }, 3000);
          },
          error: (error) => {
            console.error('Error deleting service:', error);
            this.errorMessage = 'Failed to delete the service. Please try again.';
            this.cdr.markForCheck();
          }
        });
    }
  }

  editService(serviceId: number): void {
    this.router.navigate(['/edit-service', serviceId]);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  }
}
