import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Auth } from '../../../core/services/auth';
import { BrowseServicesService, ServiceBrowseDto } from '../../../services/browse-services.service';

@Component({
  selector: 'app-service-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './service-detail.html',
  styleUrls: ['./service-detail.scss']
})
export class ServiceDetailComponent implements OnInit, OnDestroy {
  service: ServiceBrowseDto | null = null;
  loading = true;
  errorMessage = '';
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private auth: Auth,
    private browseServicesService: BrowseServicesService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = parseInt(this.route.snapshot.paramMap.get('id') ?? '0', 10);
    if (!id) { this.errorMessage = 'Invalid service.'; this.loading = false; return; }

    this.browseServicesService.getService(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: svc => {
          this.service = svc;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'Service not found.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  bookNow(): void {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/post-job' } });
      return;
    }
    const qp: Record<string, any> = {};
    if (this.service?.serviceCategoryId) qp['categoryId'] = this.service.serviceCategoryId;
    this.router.navigate(['/post-job'], { queryParams: qp });
  }

  goBack(): void {
    this.router.navigate(['/services']);
  }

  formatPrice(price: number): string {
    return `₹${price.toLocaleString('en-IN')}`;
  }

  getCategoryImage(name: string): string {
    const map: Record<string, string> = {
      cleaning:    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
      plumbing:    'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=800&q=80',
      electrical:  'https://images.unsplash.com/photo-1621905252472-943afaa20e20?auto=format&fit=crop&w=800&q=80',
      painting:    'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?auto=format&fit=crop&w=800&q=80',
      landscaping: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=80',
      carpentry:   'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80',
      handyman:    'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80',
      tutoring:    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80',
      it:          'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    };
    const key = (name ?? '').toLowerCase().replace(/\s+/g, '').replace('support', '');
    return map[key] ?? 'assets/images/services.png';
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/images/services.png';
  }
}
