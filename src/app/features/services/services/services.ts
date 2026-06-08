import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
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

  private destroy$ = new Subject<void>();
  private search$ = new Subject<string>();

  constructor(
    private router: Router,
    private auth: Auth,
    private serviceCategoryService: ServiceCategoryService,
    private browseServicesService: BrowseServicesService,
    private settingsService: SettingsService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.settingsService.getSetting('show_pro_count_on_categories')
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.showProCount = value === 'true';
        this.cdr.detectChanges();
      });

    this.search$.pipe(
      debounceTime(450),
      distinctUntilChanged(),
      switchMap(query => {
        this.servicesLoading = true;
        this.cdr.detectChanges();
        return this.browseServicesService.getServices({
          search: query || undefined,
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

  filterByCategory(categoryName: string): void {
    if (this.selectedCategory === categoryName) {
      this.selectedCategory = null;
      this.selectedCategoryId = null;
      if (!this.searchQuery.trim()) {
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
  }

  onSearch(): void {
    if (!this.searchQuery.trim() && !this.selectedCategory) {
      this.showResults = false;
      this.filteredServices = [];
      return;
    }
    this.showResults = true;
    this.search$.next(this.searchQuery);
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
    this.router.navigate(['/services', s.id]);
  }

  bookService(s: ServiceBrowseDto): void {
    if (!this.auth.isAuthenticated()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/post-job' } });
    } else {
      const qp: Record<string, any> = {};
      if (s.serviceCategoryId) qp['categoryId'] = s.serviceCategoryId;
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
