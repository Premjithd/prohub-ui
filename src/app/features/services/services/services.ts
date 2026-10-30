import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Auth } from '../../../core/services/auth';
import { ServiceCategoryService } from '../../../core/services/service-category.service';
import { ServiceCategory } from '../../../core/models/service-category.model';
import { BrowseServicesService, ServiceBrowseDto } from '../../../services/browse-services.service';
import { SettingsService } from '../../../core/services/settings.service';

type SortOrder = 'popular' | 'price-low' | 'price-high';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './services.html',
  styleUrls: ['./services.scss']
})
export class ServicesComponent implements OnInit, OnDestroy {
  services: ServiceBrowseDto[] = [];
  filteredServices: ServiceBrowseDto[] = [];
  servicesLoading = false;
  searchQuery = '';
  searchPin = '';
  selectedCategory: string | null = null;
  selectedCategoryId: number | null = null;
  sortOrder: SortOrder = 'popular';
  showResults = false;

  readonly skeletons = [1, 2, 3, 4, 5, 6];
  categories: ServiceCategory[] = [];
  categoriesLoading = true;
  categoriesError = false;
  servicesError = false;
  showProCount = false;
  // Hide the "What do you need help with?" category-filter UI (search covers discovery).
  // Categories still load so deep-links (?category=...) and in-code filtering keep working.
  showCategoryFilter = false;

  private destroy$ = new Subject<void>();
  private search$ = new Subject<string>();
  // Category requested via the URL (e.g. home category chips → /services?category=plumbing)
  private pendingCategory: string | null = null;
  private pendingCategoryId: number | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private auth: Auth,
    private serviceCategoryService: ServiceCategoryService,
    private browseServicesService: BrowseServicesService,
    private settingsService: SettingsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // A category may be requested via the URL (home category chips link here).
    this.pendingCategory = this.route.snapshot.queryParamMap.get('category');
    const cid = Number(this.route.snapshot.queryParamMap.get('categoryId'));
    this.pendingCategoryId = cid > 0 ? cid : null;

    this.loadCategories();
    this.settingsService.getSetting('show_pro_count_on_categories')
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.showProCount = value === 'true';
        this.cdr.detectChanges();
      });

    this.search$.pipe(
      debounceTime(450),
      // Key includes the PIN so changing only the area still triggers a fresh search.
      distinctUntilChanged(),
      switchMap(() => {
        this.servicesLoading = true;
        this.cdr.detectChanges();
        return this.browseServicesService.getServices({
          search: this.searchQuery.trim() || undefined,
          pin: this.searchPin.trim() || undefined,
          categoryId: this.selectedCategoryId || undefined,
        }).pipe(takeUntil(this.destroy$));
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: result => {
        this.services = result.items;
        this.applyClientSort();
        this.servicesLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.servicesLoading = false;
        this.servicesError = true;
        this.cdr.detectChanges();
      }
    });

    // A search term / PIN may be passed from the home "Get Quotes" box (logged-out
    // visitors land here instead of post-job). Apply it once the search pipe above is
    // subscribed so results show immediately.
    const search = this.route.snapshot.queryParamMap.get('search');
    const pin = this.route.snapshot.queryParamMap.get('pin');
    if (search) this.searchQuery = search;
    if (pin) this.searchPin = pin;
    if (search || pin) {
      this.onSearch();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories(): void {
    this.categoriesLoading = true;
    this.categoriesError = false;
    this.serviceCategoryService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: categories => {
          this.categories = categories;
          this.categoriesLoading = false;
          this.applyCategoryFromParams();
          this.cdr.detectChanges();
        },
        error: () => {
          this.categories = [];
          this.categoriesLoading = false;
          this.categoriesError = true;
          this.cdr.detectChanges();
        }
      });
  }

  loadServices(): void {
    this.servicesLoading = true;
    this.servicesError = false;
    this.browseServicesService.getServices({
      categoryId: this.selectedCategoryId || undefined,
      search: this.searchQuery.trim() || undefined,
      pin: this.searchPin.trim() || undefined,
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: result => {
        this.services = result.items;
        this.applyClientSort();
        this.servicesLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.services = [];
        this.filteredServices = [];
        this.servicesLoading = false;
        this.servicesError = true;
        this.cdr.detectChanges();
      }
    });
  }

  /** Resolve a category passed via the URL (?category=slug or ?categoryId=N) and show its results. */
  private applyCategoryFromParams(): void {
    let cat = this.pendingCategoryId
      ? this.categories.find(c => c.id === this.pendingCategoryId)
      : this.pendingCategory
        ? this.categories.find(c => this.normalizeName(c.name) === this.normalizeName(this.pendingCategory!))
        : undefined;

    // Consume the pending params so they don't re-apply on later interactions.
    this.pendingCategory = null;
    this.pendingCategoryId = null;
    if (!cat) return;

    this.selectedCategory = cat.name;
    this.selectedCategoryId = cat.id;
    this.showResults = true;
    this.loadServices();
    this.scrollToResults();
  }

  private normalizeName(s: string): string {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  filterByCategory(categoryName: string): void {
    if (this.selectedCategory === categoryName) {
      this.selectedCategory = null;
      this.selectedCategoryId = null;
      if (!this.searchQuery.trim() && !this.searchPin.trim()) {
        this.showResults = false;
        this.filteredServices = [];
        return;
      }
    } else {
      this.selectedCategory = categoryName;
      const cat = this.categories.find(c => c.name === categoryName);
      this.selectedCategoryId = cat ? cat.id : null;
    }
    this.showResults = true;
    this.loadServices();
    this.scrollToResults();
  }

  onSearch(): void {
    if (!this.searchQuery.trim() && !this.searchPin.trim() && !this.selectedCategory) {
      this.showResults = false;
      this.filteredServices = [];
      return;
    }
    this.showResults = true;
    // Emit a composite key so distinctUntilChanged reacts to either text or PIN changing.
    this.search$.next(`${this.searchQuery.trim()}|${this.searchPin.trim()}`);
    this.scrollToResults();
  }

  private scrollToResults(): void {
    setTimeout(() => {
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  sortBy(order: SortOrder): void {
    this.sortOrder = order;
    this.applyClientSort();
  }

  private applyClientSort(): void {
    let sorted = [...this.services];
    switch (this.sortOrder) {
      case 'price-low':
        sorted.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        sorted.sort((a, b) => b.price - a.price);
        break;
    }
    this.filteredServices = sorted;
  }

  getCategoryImage(name: string): string {
    const key = name.toLowerCase().replace(/\s+/g, '').replace('support', '');
    return this.SERVICE_IMAGES[key] ?? 'assets/images/services.png';
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/images/services.png';
  }

  openService(s: ServiceBrowseDto): void {
    const target = `/services/${s.id}`;
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: target } });
      return;
    }
    this.router.navigate(['/services', s.id]);
  }

  bookService(s: ServiceBrowseDto): void {
    const qp: Record<string, any> = {};
    if (s.serviceCategoryId) qp['categoryId'] = s.serviceCategoryId;
    // Carry the chosen pro so the job is sent directly to them (while still open to all).
    if (s.proId) qp['proId'] = s.proId;
    const proLabel = s.businessName || s.proName;
    if (proLabel) qp['proName'] = proLabel;

    if (!this.auth.isAuthenticated()) {
      const returnUrl = this.router.createUrlTree(['/post-job'], { queryParams: qp }).toString();
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl } });
    } else {
      this.router.navigate(['/post-job'], { queryParams: qp });
    }
  }

  navigateTo(path: string): void {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: path } });
    } else {
      this.router.navigate([path]);
    }
  }

  private readonly SERVICE_IMAGES: Record<string, string> = {
    cleaning:    'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
    plumbing:    'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=600&q=80',
    electrical:  'https://images.unsplash.com/photo-1621905252472-943afaa20e20?auto=format&fit=crop&w=600&q=80',
    painting:    'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?auto=format&fit=crop&w=600&q=80',
    landscaping: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80',
    carpentry:   'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=600&q=80',
    handyman:    'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=600&q=80',
    tutoring:    'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80',
    it:          'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=600&q=80',
  };
}
