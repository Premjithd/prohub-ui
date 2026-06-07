import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { HttpClient } from '@angular/common/http';
import { Subject, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { ProBrowseService, BrowsePro } from '../../services/pro-browse.service';
import { ServiceCategoryService } from '../../core/services/service-category.service';
import { ServiceCategory } from '../../core/models/service-category.model';
import { ServiceAreaService, ServiceArea } from '../../core/services/service-area.service';
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
    MatFormFieldModule, MatInputModule, MatSelectModule
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

  // Location filters
  serviceAreas: ServiceArea[] = [];
  filterCountry = 'India';
  filterState = '';
  filterDistrict = '';
  filterPin = '';

  // Pagination
  page = 1;
  readonly pageSize = 10;
  totalCount = 0;

  selectedPro: BrowsePro | null = null;
  proServices: Service[] = [];
  proServicesLoading = false;
  proRatingSummary: ProRatingSummary | null = null;
  proReviews: Review[] = [];
  proReviewsLoading = false;
  readonly starsArray = [1, 2, 3, 4, 5];

  // Direct Leaflet map
  private leafletMap: any = null;
  private leafletProMarkers: any[] = [];
  private leafletMarkerMap = new Map<number, any>();
  isGeocodingPros = false;
  private mapLoadId = 0;
  private geocodeCache = new Map<string, { lat: number; lng: number } | null>();

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private proBrowseService: ProBrowseService,
    private serviceCategoryService: ServiceCategoryService,
    private serviceAreaService: ServiceAreaService,
    private cdr: ChangeDetectorRef,
    private auth: Auth,
    private addressService: AddressService,
    private myServicesService: MyServicesService,
    private router: Router,
    private reviewService: ReviewService,
    private http: HttpClient,
    private zone: NgZone
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

    this.serviceAreaService.getActive().pipe(takeUntil(this.destroy$)).subscribe({
      next: areas => { this.serviceAreas = areas; this.cdr.markForCheck(); },
      error: () => {}
    });

    this.search$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => { this.page = 1; this.load(); });

    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.search$.complete();
    if (this.leafletMap) { this.leafletMap.remove(); this.leafletMap = null; }
  }

  // ── Location filter derived options ─────────────────────

  get uniqueCountries(): string[] {
    return [...new Set(this.serviceAreas.map(a => a.country).filter(Boolean))].sort();
  }

  get stateOptions(): string[] {
    if (!this.filterCountry) return [];
    return [...new Set(
      this.serviceAreas
        .filter(a => a.country?.toLowerCase() === this.filterCountry.toLowerCase() && a.state)
        .map(a => a.state!)
    )].sort();
  }

  get districtOptions(): string[] {
    if (!this.filterState) return [];
    return [...new Set(
      this.serviceAreas
        .filter(a => a.state?.toLowerCase() === this.filterState.toLowerCase() && a.district)
        .map(a => a.district!)
    )].sort();
  }

  get pinOptions(): string[] {
    if (!this.filterDistrict) return [];
    return [...new Set(
      this.serviceAreas
        .filter(a => a.district?.toLowerCase() === this.filterDistrict.toLowerCase() && a.pinCode)
        .map(a => a.pinCode!)
    )].sort();
  }

  get hasLocationFilter(): boolean {
    return !!(this.filterCountry || this.filterState || this.filterDistrict || this.filterPin);
  }

  // ── Pagination ───────────────────────────────────────────

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const around = new Set([1, total, this.page - 1, this.page, this.page + 1]
      .filter(n => n >= 1 && n <= total));
    return [...around].sort((a, b) => a - b);
  }

  showGapBefore(index: number, nums: number[]): boolean {
    return index > 0 && nums[index] - nums[index - 1] > 1;
  }

  goToPage(n: number): void {
    if (n < 1 || n > this.totalPages || n === this.page) return;
    this.page = n;
    this.load();
  }

  // ── Filter change handlers ───────────────────────────────

  onCountryChange(): void {
    this.filterState = '';
    this.filterDistrict = '';
    this.filterPin = '';
    this.page = 1;
    this.load();
  }

  onStateChange(): void {
    this.filterDistrict = '';
    this.filterPin = '';
    this.page = 1;
    this.load();
  }

  onDistrictChange(): void {
    this.filterPin = '';
    this.page = 1;
    this.load();
  }

  onPinChange(): void {
    this.page = 1;
    this.load();
  }

  clearLocationFilter(): void {
    this.filterCountry = '';
    this.filterState = '';
    this.filterDistrict = '';
    this.filterPin = '';
    this.page = 1;
    this.load();
  }

  // ── Core load ────────────────────────────────────────────

  load(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.proBrowseService.browse({
      search:     this.searchText.trim() || undefined,
      categoryId: this.selectedCategoryId,
      country:    this.filterCountry  || undefined,
      state:      this.filterState    || undefined,
      district:   this.filterDistrict || undefined,
      pinCode:    this.filterPin      || undefined,
      page:       this.page,
      pageSize:   this.pageSize,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: result => {
        this.pros = result.items;
        this.totalCount = result.total;
        this.loading = false;
        this.cdr.markForCheck();
        if (this.showMap) {
          if (!this.leafletMap) {
            setTimeout(() => this.initProMap(), 150);
          } else {
            this.loadProMapMarkers();
          }
        }
      },
      error: () => {
        this.errorMessage = 'Failed to load professionals. Please try again.';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ── Direct Leaflet map ───────────────────────────────────

  private async initProMap(): Promise<void> {
    const container = document.getElementById('pro-map');
    if (!container) return;

    const L = await import('leaflet');
    if (this.leafletMap) { this.leafletMap.remove(); this.leafletMap = null; }

    this.leafletMap = L.map(container).setView([20, 78], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18
    }).addTo(this.leafletMap);

    await this.loadProMapMarkers();
  }

  async loadProMapMarkers(): Promise<void> {
    if (!this.leafletMap) return;
    const L = await import('leaflet');
    const loadId = ++this.mapLoadId;

    this.leafletProMarkers.forEach(m => { try { m.remove(); } catch {} });
    this.leafletProMarkers = [];
    this.leafletMarkerMap.clear();
    this.isGeocodingPros = true;
    this.cdr.markForCheck();

    const latLngs: [number, number][] = [];
    // Track how many markers have been placed at each geocoded point so
    // we can apply a spiral offset to avoid stacking.
    const posUsage = new Map<string, number>();

    for (const pro of this.pros) {
      if (loadId !== this.mapLoadId) return;
      const pos = await this.geocodePro(pro);
      if (loadId !== this.mapLoadId) return;
      if (!pos) continue;

      // Jitter geocoded-only positions so multiple pros in the same city
      // don't all render as one invisible dot.
      const isExact = pro.latitude != null && pro.longitude != null;
      let lat = pos.lat;
      let lng = pos.lng;
      if (!isExact) {
        const posKey = `${pos.lat.toFixed(3)},${pos.lng.toFixed(3)}`;
        const n = posUsage.get(posKey) ?? 0;
        posUsage.set(posKey, n + 1);
        if (n > 0) {
          // Golden-angle spiral so markers fan out evenly
          const r = 0.003 * Math.ceil(n / 8);
          const angle = n * 2.39996;
          lat += r * Math.cos(angle);
          lng += r * Math.sin(angle);
        }
      }

      latLngs.push([lat, lng]);

      const isHighlighted = this.highlightedProId === pro.id;
      const icon = this.buildProIcon(L, isHighlighted);

      const services = (pro.services ?? []).slice(0, 3).map(s => this.escHtml(s.name)).join(', ');
      const location = [pro.city, pro.state, pro.country].filter(Boolean).map(s => this.escHtml(s!)).join(', ');
      const popup = `<div style="font-family:Roboto,sans-serif;min-width:160px;line-height:1.5">
        <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#1f2937">${this.escHtml(pro.proName)}</p>
        ${pro.businessName ? `<p style="margin:0 0 2px;font-size:12px;color:#6b7280">${this.escHtml(pro.businessName)}</p>` : ''}
        ${location ? `<p style="margin:0 0 4px;font-size:12px;color:#9ca3af">${location}</p>` : ''}
        ${services ? `<p style="margin:0;font-size:12px;color:#667eea">${services}</p>` : ''}
        ${pro.isEmailVerified ? '<span style="font-size:12px;font-weight:600;color:#10b981">✓ Verified</span>' : ''}
      </div>`;

      const marker = L.marker([lat, lng], { icon })
        .bindPopup(popup, { maxWidth: 240 });

      marker.on('click', () => {
        this.zone.run(() => this.onMapMarkerClick(pro.id));
      });

      marker.addTo(this.leafletMap);
      this.leafletProMarkers.push(marker);
      this.leafletMarkerMap.set(pro.id, marker);
    }

    if (loadId !== this.mapLoadId) return;

    if (this.filterDistrict) {
      // Always zoom to the selected district bounding box so the viewport is right
      // even when pros' City fields don't match the district name exactly.
      await this.fitMapToRegion(loadId);
    } else if (latLngs.length === 1) {
      this.leafletMap.setView(latLngs[0], 12);
    } else if (latLngs.length > 1) {
      this.leafletMap.fitBounds(latLngs as any, { padding: [40, 40], maxZoom: 12 });
    } else if (this.filterState || this.filterCountry) {
      await this.fitMapToRegion(loadId);
    }

    if (loadId !== this.mapLoadId) return;
    this.isGeocodingPros = false;
    this.cdr.markForCheck();
  }

  private async fitMapToRegion(loadId: number): Promise<void> {
    // Use the most specific active filter so the map zooms to the right area.
    const regionKey = [this.filterDistrict, this.filterState, this.filterCountry].filter(Boolean).join(', ');
    if (!regionKey) return;

    try {
      const countryCode = this.countryToIsoCode(this.filterCountry);
      const results = await firstValueFrom(
        this.http.get<any[]>(`${environment.apiUrl}/address/search`, {
          params: { query: regionKey, countryCode }
        })
      );
      if (loadId !== this.mapLoadId) return;
      if (Array.isArray(results) && results.length > 0) {
        const r = results[0];
        const bb = r.boundingbox;
        if (bb && bb.length === 4) {
          // Nominatim boundingbox: [minLat, maxLat, minLng, maxLng]
          this.leafletMap.fitBounds(
            [[parseFloat(bb[0]), parseFloat(bb[2])], [parseFloat(bb[1]), parseFloat(bb[3])]] as any,
            { padding: [40, 40], maxZoom: 10 }
          );
        } else {
          this.leafletMap.setView([parseFloat(r.lat), parseFloat(r.lon)], 8);
        }
      }
    } catch {}
  }

  private async geocodePro(pro: BrowsePro): Promise<{ lat: number; lng: number } | null> {
    if (pro.latitude != null && pro.longitude != null) {
      return { lat: pro.latitude, lng: pro.longitude };
    }

    // Use the pro's own city first; fall back to the district filter as a hint
    // only when city is not set (avoids forcing all pros to the same district centre).
    const city    = pro.city    || this.filterDistrict || undefined;
    const state   = pro.state           || this.filterState   || undefined;
    const country = pro.country         || this.filterCountry || undefined;

    // Build queries from most to least specific (free-text `q=` works best for
    // Indian locations which are admin areas, not OSM `city=` nodes).
    const queryStrings: string[] = [];
    if (city && state && country) {
      queryStrings.push(`${city}, ${state}, ${country}`);
      queryStrings.push(`${state}, ${country}`);  // fallback without city
    } else if (city && state) {
      queryStrings.push(`${city}, ${state}`);
      queryStrings.push(state);
    } else if (state && country) {
      queryStrings.push(`${state}, ${country}`);
    } else if (country) {
      queryStrings.push(country);
    }

    if (queryStrings.length === 0) return null;

    const cacheKey = queryStrings[0];
    if (this.geocodeCache.has(cacheKey)) return this.geocodeCache.get(cacheKey) ?? null;

    const countryCode = this.countryToIsoCode(country);

    for (const query of queryStrings) {
      try {
        // Route through the backend proxy — the browser cannot set User-Agent,
        // and the auth interceptor adds Authorization headers to direct
        // Nominatim calls which causes CORS preflight failures.
        const results = await firstValueFrom(
          this.http.get<any[]>(`${environment.apiUrl}/address/search`, {
            params: { query, countryCode }
          })
        );
        if (Array.isArray(results) && results.length > 0) {
          const r = results[0];
          const lat = parseFloat(r.lat);
          const lng = parseFloat(r.lon);
          if (!isNaN(lat) && !isNaN(lng)) {
            const pos = { lat, lng };
            this.geocodeCache.set(cacheKey, pos);
            return pos;
          }
        }
      } catch {}
    }

    // Don't cache failures — transient errors should be retried on next load.
    return null;
  }

  private countryToIsoCode(country?: string): string {
    if (!country) return 'in';
    const map: Record<string, string> = {
      'india': 'in', 'uk': 'gb', 'united kingdom': 'gb', 'england': 'gb',
      'us': 'us', 'usa': 'us', 'united states': 'us', 'australia': 'au', 'canada': 'ca',
    };
    return map[country.toLowerCase()] ?? 'in';
  }

  private buildProIcon(L: any, highlighted: boolean): any {
    const color = highlighted ? '#ff9800' : '#667eea';
    const size = highlighted ? 26 : 18;
    return L.divIcon({
      className: '',
      html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
  }

  private async updateMarkerHighlight(): Promise<void> {
    if (!this.leafletMap) return;
    const L = await import('leaflet');
    for (const [proId, marker] of this.leafletMarkerMap) {
      marker.setIcon(this.buildProIcon(L, proId === this.highlightedProId));
    }
  }

  private escHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Other helpers ────────────────────────────────────────

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
      () => {}
    );
  }

  onSearchChange(): void {
    this.search$.next(this.searchText);
  }

  onCategoryChange(): void {
    this.page = 1;
    this.load();
  }

  hoverPro(id: number | null): void {
    this.highlightedProId = id;
    this.cdr.markForCheck();
    this.updateMarkerHighlight();
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
    // Destroy the Leaflet map before the panel hides its container
    if (this.leafletMap) { this.leafletMap.remove(); this.leafletMap = null; }
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
    if (this.showMap) {
      setTimeout(() => this.initProMap(), 150);
    }
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
    if (this.showMap) {
      setTimeout(() => this.initProMap(), 150);
    } else {
      if (this.leafletMap) { this.leafletMap.remove(); this.leafletMap = null; }
    }
  }

  getLocation(pro: BrowsePro): string {
    return [pro.city, pro.state, pro.country].filter(Boolean).join(', ') || 'Location not set';
  }
}
