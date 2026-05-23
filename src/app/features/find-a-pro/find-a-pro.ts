import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
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

  mapMarkers: MapMarker[] = [];

  @ViewChild(MapViewComponent) mapView?: MapViewComponent;

  private search$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(
    private proBrowseService: ProBrowseService,
    private serviceCategoryService: ServiceCategoryService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
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
    this.highlightedProId = pro.id;
    this.cdr.markForCheck();
    if (pro.latitude && pro.longitude) {
      this.mapView?.panTo(pro.id);
    }
  }

  onMapMarkerClick(id: number): void {
    this.highlightedProId = id;
    this.cdr.markForCheck();
    const el = document.getElementById(`pro-card-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  toggleMap(): void {
    this.showMap = !this.showMap;
    this.cdr.markForCheck();
  }

  getLocation(pro: BrowsePro): string {
    return [pro.city, pro.state, pro.country].filter(Boolean).join(', ') || 'Location not set';
  }
}
