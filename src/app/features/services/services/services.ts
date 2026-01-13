import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Auth } from '../../../core/services/auth';
import { ServiceCategoryService } from '../../../core/services/service-category.service';
import { ServiceCategory } from '../../../core/models/service-category.model';

interface ServiceItem {
  id: number;
  name: string;
  description?: string;
  price?: number;
  image?: string;
  rating?: number;
  reviews?: number;
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
  imports: [CommonModule, FormsModule],
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
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private auth: Auth,
    private serviceCategoryService: ServiceCategoryService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadServices();
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

  loadServices(): void {
    this.services = [
      {
        id: 1,
        name: 'Home Cleaning',
        description: 'Professional deep cleaning for homes and apartments. Eco-friendly products used.',
        price: 120,
        rating: 4.9,
        reviews: 156,
        category: 'cleaning',
        image: 'assets/images/services.png',
        featured: true
      },
      {
        id: 2,
        name: 'Plumbing Repair',
        description: 'Expert leak fixes, pipe repairs and new installations. 24/7 emergency service available.',
        price: 85,
        rating: 4.8,
        reviews: 203,
        category: 'plumbing',
        image: 'assets/images/services.png'
      },
      {
        id: 3,
        name: 'Electrical Installation',
        description: 'Licensed electricians for wiring, fixtures, and panel upgrades. Fully insured.',
        price: 150,
        rating: 4.9,
        reviews: 189,
        category: 'electrical',
        image: 'assets/images/services.png',
        featured: true
      },
      {
        id: 4,
        name: 'Interior Painting',
        description: 'Transform your space with professional interior painting. Premium paints and finishes.',
        price: 200,
        rating: 4.7,
        reviews: 98,
        category: 'painting',
        image: 'assets/images/services.png'
      },
      {
        id: 5,
        name: 'Yard Landscaping',
        description: 'Design and maintenance of outdoor spaces. Lawn care, planting, and hardscaping.',
        price: 175,
        rating: 4.8,
        reviews: 124,
        category: 'landscaping',
        image: 'assets/images/services.png'
      },
      {
        id: 6,
        name: 'General Handyman',
        description: 'Reliable handyman for repairs, maintenance, and small projects around your home.',
        price: 65,
        rating: 4.6,
        reviews: 267,
        category: 'handyman',
        image: 'assets/images/services.png'
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
        filtered.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
        break;
      case 'price-low':
        filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
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
