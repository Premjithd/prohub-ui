import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ProBrowseService, BrowsePro } from '../../services/pro-browse.service';
import { ServiceCategoryService } from '../../core/services/service-category.service';
import { ServiceCategory } from '../../core/models/service-category.model';
import { MapViewComponent, MapMarker } from '../../shared/map-view/map-view';
import { Auth } from '../../core/services/auth';
import { AddressService } from '../../core/services/address.service';
import { MyServicesService, Service } from '../../services/my-services.service';
import { ReviewService } from '../../services/review.service';
import { Review, ProRatingSummary } from '../../models/review.model';

const PREVIEW_PROS: BrowsePro[] = [
  {
    id: -1, proName: 'Alice Johnson', businessName: 'Johnson Plumbing Services',
    city: 'London', state: 'England', country: 'UK', isEmailVerified: true,
    services: [{ id: 1, name: 'Plumbing', price: 60 }, { id: 2, name: 'Pipe Repair', price: 45 }]
  },
  {
    id: -2, proName: 'Bob Martinez', businessName: 'Martinez Electrical',
    city: 'Manchester', state: 'England', country: 'UK', isEmailVerified: true,
    services: [{ id: 3, name: 'Electrical', price: 75 }, { id: 4, name: 'Wiring', price: 90 }]
  },
  {
    id: -3, proName: 'Carol Williams', businessName: 'Sparkle Clean Co.',
    city: 'Birmingham', state: 'England', country: 'UK', isEmailVerified: true,
    services: [{ id: 5, name: 'House Cleaning', price: 35 }]
  },
  {
    id: -4, proName: 'David Chen', businessName: 'Chen Carpentry',
    city: 'Bristol', state: 'England', country: 'UK', isEmailVerified: true,
    services: [{ id: 6, name: 'Carpentry', price: 55 }, { id: 7, name: 'Furniture Assembly', price: 40 }]
  },
  {
    id: -5, proName: 'Emma Davis', businessName: 'Davis Decorating',
    city: 'Leeds', state: 'England', country: 'UK', isEmailVerified: true,
    services: [{ id: 8, name: 'Painting', price: 50 }, { id: 9, name: 'Decorating', price: 65 }]
  }
];

@Component({
  selector: 'app-find-a-pro',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    MatIconModule, MatButtonModule, MatProgressSpinnerModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MapViewComponent
  ],
  templateUrl: './find-a-pro.html',
  styleUrl: './find-a-pro.scss'
})
export class FindAProComponent implements OnInit, OnDestroy {
  pros: BrowsePro[] = [];
  loading = false;
  errorMessage = '';
  searchText = '';
  selectedCategoryId: number | null = null;
  categories: ServiceCategory[] = [];
  highlightedProId: number | null = null;
  showMap = true;
  isAuthenticated = false;

  selectedPro: BrowsePro | null = null;
  proServices: Service[] = [];
  proServicesLoading = false;
  proRatingSummary: ProRatingSummary | null = null;
  proReviews: Review[] = [];
  proReviewsLoading = false;
  readonly starsArray = [1, 2, 3, 4, 5];

  mapMarkers: MapMarker[] = [];

  @ViewChild(MapViewComponent) mapView?: MapViewComponent;

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private proBrowseService: ProBrowseService,
    private serviceCategoryService: ServiceCategoryService,
    private cdr: ChangeDetectorRef,
    private auth: Auth,
    private addressService: AddressService,
    private myServicesService: MyServicesService,
    private router: Router,
    private reviewService: ReviewService
  ) {}

  ngOnInit(): void {
    this.isAuthenticated = this.auth.isAuthenticated();

    if (!this.isAuthenticated) {
      this.pros = PREVIEW_PROS.map(p => ({ ...p }));
      this.showMap = false;
      this.applyUserLocationToPreviews();
      return;
    }

    this.serviceCategoryService.getCategories().pipe(takeUntil(this.destroy$)).subscribe({
      next: cats => { this.categories = cats; this.cdr.markForCheck(); }
    });

    this.search$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => this.load());

    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.search$.complete();
  }

  private applyUserLocationToPreviews(): void {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.addressService.reverseGeocode(coords.latitude, coords.longitude)
          .pipe(takeUntil(this.destroy$))
          .subscribe(loc => {
            if (loc.city || loc.state) {
              this.pros = this.pros.map(p => ({
                ...p,
                city: loc.city || p.city,
                state: loc.state || p.state,
                country: loc.country || p.country
              }));
              this.cdr.markForCheck();
            }
          });
      },
      () => { /* permission denied — keep default locations */ }
    );
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.proBrowseService.browse(this.searchText.trim() || undefined, this.selectedCategoryId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (pros) => {
          this.pros = pros;
          this.mapMarkers = pros
            .filter(p => p.latitude != null && p.longitude != null)
            .map(p => ({
              id: p.id,
              lat: p.latitude!,
              lng: p.longitude!,
              title: p.businessName || p.proName,
              subtitle: [p.city, p.state].filter(Boolean).join(', '),
              type: 'pro' as const,
              radiusKm: p.serviceRadiusKm
            }));
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'Failed to load professionals. Please try again.';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  onSearchChange(): void {
    this.search$.next(this.searchText);
  }

  onCategoryChange(): void {
    this.load();
  }

  hoverPro(id: number | null): void {
    this.highlightedProId = id;
    this.cdr.markForCheck();
  }

  clickPro(pro: BrowsePro): void {
    if (!this.isAuthenticated) return;
    this.highlightedProId = pro.id;
    this.selectedPro = pro;
    this.proServices = [];
    this.proServicesLoading = true;
    this.proRatingSummary = null;
    this.proReviews = [];
    this.proReviewsLoading = true;
    this.cdr.markForCheck();

    this.reviewService.getProRatingSummary(pro.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: summary => { this.proRatingSummary = summary; this.cdr.markForCheck(); },
        error: () => { this.cdr.markForCheck(); }
      });

    this.reviewService.getProReviews(pro.id, 1, 5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          this.proReviews = result.reviews ?? [];
          this.proReviewsLoading = false;
          this.cdr.markForCheck();
        },
        error: () => { this.proReviewsLoading = false; this.cdr.markForCheck(); }
      });

    this.myServicesService.getMyServices(pro.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: services => {
          this.proServices = services;
          this.proServicesLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.proServicesLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  closePro(): void {
    this.selectedPro = null;
    this.proServices = [];
    this.proRatingSummary = null;
    this.proReviews = [];
    this.cdr.markForCheck();
  }

  starFilled(rating: number, index: number): boolean {
    return index + 1 <= Math.round(rating);
  }

  onMapMarkerClick(id: number): void {
    const pro = this.pros.find(p => p.id === id);
    if (pro) {
      this.clickPro(pro);
    } else {
      this.highlightedProId = id;
      this.cdr.markForCheck();
    }
    const el = document.getElementById(`pro-card-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  isProUser(): boolean { return this.auth.getUserType() === 'Pro'; }
  isAdmin(): boolean { return this.auth.getUserType() === 'Admin'; }
  canPostJob(): boolean { return this.isAuthenticated && !this.isProUser() && !this.isAdmin(); }

  postJobForService(service: Service): void {
    const params: Record<string, string> = {};
    if (service.serviceCategoryId) params['categoryId'] = String(service.serviceCategoryId);
    if (service.name) params['title'] = service.name;
    this.router.navigate(['/post-job'], { queryParams: params });
  }

  postJobGeneral(): void {
    this.router.navigate(['/post-job']);
  }

  toggleMap(): void {
    this.showMap = !this.showMap;
    this.cdr.markForCheck();
  }

  getLocation(pro: BrowsePro): string {
    return [pro.city, pro.state, pro.country].filter(Boolean).join(', ') || 'Location not set';
  }
}
