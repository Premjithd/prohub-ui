import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Auth } from '../../../core/services/auth';
import { ServiceCategoryService } from '../../../core/services/service-category.service';
import { ServiceCategory } from '../../../core/models/service-category.model';
import { ProBrowseService, BrowsePro } from '../../../services/pro-browse.service';
import { MapViewComponent, MapMarker } from '../../../shared/map-view/map-view';

interface ServiceItem {
  id: number;
  name: string;
  description?: string;
  price?: number;
  image?: string;
  category?: string;
  featured?: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MapViewComponent],
  templateUrl: './services.html',
  styleUrls: ['./services.scss']
})
export class ServicesComponent implements OnInit, OnDestroy {
  services: ServiceItem[] = [];
  filteredServices: ServiceItem[] = [];
  searchQuery = '';
  selectedCategory: string | null = null;
  sortOrder = 'popular';

  categories: ServiceCategory[] = [];
  categoriesLoading = true;

  // Pros map
  pros: BrowsePro[] = [];
  prosMapMarkers: MapMarker[] = [];
  prosLoading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private auth: Auth,
    private serviceCategoryService: ServiceCategoryService,
    private proBrowseService: ProBrowseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadServices();
    this.loadProsMap();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategories(): void {
    this.categoriesLoading = true;
    this.cdr.detectChanges();
    console.log('Starting to load categories...');
    this.serviceCategoryService.getCategories()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (categories: ServiceCategory[]) => {
          console.log('✅ Categories loaded successfully:', categories);
          this.categories = categories;
          this.categoriesLoading = false;
          this.cdr.detectChanges();
          console.log('Category count:', this.categories.length);
        },
        error: (error: any) => {
          console.error('❌ Error fetching categories:', error);
          console.error('Error details:', {
            status: error?.status,
            statusText: error?.statusText,
            message: error?.message,
            url: error?.url
          });
          this.categories = [];
          this.categoriesLoading = false;
          this.cdr.detectChanges();
        },
        complete: () => {
          console.log('Category subscription completed');
        }
      });
  }

  loadProsMap(): void {
    this.prosLoading = true;
    this.proBrowseService.browse().pipe(takeUntil(this.destroy$)).subscribe({
      next: (pros) => {
        this.pros = pros;
        this.prosMapMarkers = pros
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
        this.prosLoading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.prosLoading = false; this.cdr.detectChanges(); }
    });
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

  getCategoryImage(name: string): string {
    const key = name.toLowerCase().replace(/\s+/g, '').replace('support', '');
    return this.SERVICE_IMAGES[key] ?? 'assets/images/services.png';
  }

  onImgError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/images/services.png';
  }

  loadServices(): void {
    this.services = [
      {
        id: 1,
        name: 'Home Cleaning',
        description: 'Professional deep cleaning for homes and apartments. Eco-friendly products used.',
        price: 120,
        category: 'cleaning',
        image: this.SERVICE_IMAGES['cleaning'],
        featured: true
      },
      {
        id: 2,
        name: 'Plumbing Repair',
        description: 'Expert leak fixes, pipe repairs and new installations. 24/7 emergency service available.',
        price: 85,
        category: 'plumbing',
        image: this.SERVICE_IMAGES['plumbing']
      },
      {
        id: 3,
        name: 'Electrical Installation',
        description: 'Licensed electricians for wiring, fixtures, and panel upgrades. Fully insured.',
        price: 150,
        category: 'electrical',
        image: this.SERVICE_IMAGES['electrical'],
        featured: true
      },
      {
        id: 4,
        name: 'Interior Painting',
        description: 'Transform your space with professional interior painting. Premium paints and finishes.',
        price: 200,
        category: 'painting',
        image: this.SERVICE_IMAGES['painting']
      },
      {
        id: 5,
        name: 'Yard Landscaping',
        description: 'Design and maintenance of outdoor spaces. Lawn care, planting, and hardscaping.',
        price: 175,
        category: 'landscaping',
        image: this.SERVICE_IMAGES['landscaping']
      },
      {
        id: 6,
        name: 'General Handyman',
        description: 'Reliable handyman for repairs, maintenance, and small projects around your home.',
        price: 65,
        category: 'handyman',
        image: this.SERVICE_IMAGES['handyman']
      }
    ];
    this.applyFiltersAndSort();
  }

  filterByCategory(categoryName: string): void {
    this.selectedCategory = this.selectedCategory === categoryName ? null : categoryName;
    this.applyFiltersAndSort();
  }

  onSearch(): void {
    this.applyFiltersAndSort();
  }

  sortBy(order: string): void {
    this.sortOrder = order;
    this.applyFiltersAndSort();
  }

  applyFiltersAndSort(): void {
    let filtered = [...this.services];

    // Apply category filter
    if (this.selectedCategory) {
      const selectedCategoryLower = this.selectedCategory.toLowerCase();
      filtered = filtered.filter(s => s.category?.toLowerCase() === selectedCategoryLower);
    }

    // Apply search filter
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    switch (this.sortOrder) {
      case 'popular':
        // no real popularity data — leave default order
        break;
      case 'price-low':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
    }

    this.filteredServices = filtered;
  }

  openService(s: ServiceItem): void {
    this.router.navigate(['/services', s.id]);
  }

  bookService(s: ServiceItem): void {
    this.router.navigate(['/services', s.id, 'book']);
  }

  navigateTo(path: string): void {
    // If navigating to post a job, check authentication
    if (path === '/auth/login') {
      if (this.auth.isAuthenticated()) {
        // If user is logged in, redirect to post-job page
        this.router.navigate(['/post-job']);
      } else {
        // If user is not logged in, redirect to registration
        this.router.navigate([path]);
      }
    } else {
      this.router.navigate([path]);
    }
  }
}
