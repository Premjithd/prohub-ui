import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ServiceBrowseDto {
  id: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  proId: number;
  proName?: string;
  businessName?: string;
  city?: string;
  state?: string;
  serviceCategoryId?: number;
  categoryName?: string;
  categoryIcon?: string;
  distanceKm?: number | null;
}

export interface ServicePagedResult {
  items: ServiceBrowseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ServiceBrowseParams {
  page?: number;
  pageSize?: number;
  categoryId?: number | null;
  search?: string;
  city?: string;
  pin?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sortBy?: 'name' | 'price-low' | 'price-high';
}

@Injectable({ providedIn: 'root' })
export class BrowseServicesService {
  private readonly apiUrl = `${environment.apiUrl}/services`;

  constructor(private http: HttpClient) {}

  getService(id: number): Observable<ServiceBrowseDto> {
    return this.http.get<ServiceBrowseDto>(`${this.apiUrl}/${id}`);
  }

  getServices(params: ServiceBrowseParams = {}): Observable<ServicePagedResult> {
    let httpParams = new HttpParams();
    if (params.page)       httpParams = httpParams.set('page', params.page);
    if (params.pageSize)   httpParams = httpParams.set('pageSize', params.pageSize);
    if (params.categoryId) httpParams = httpParams.set('categoryId', params.categoryId);
    if (params.search)     httpParams = httpParams.set('search', params.search);
    if (params.city)       httpParams = httpParams.set('city', params.city);
    if (params.pin)        httpParams = httpParams.set('pin', params.pin);
    if (params.lat != null) httpParams = httpParams.set('lat', params.lat);
    if (params.lng != null) httpParams = httpParams.set('lng', params.lng);
    if (params.radiusKm != null) httpParams = httpParams.set('radiusKm', params.radiusKm);
    if (params.sortBy)     httpParams = httpParams.set('sortBy', params.sortBy);

    return this.http.get<any>(this.apiUrl, { params: httpParams }).pipe(
      map(response => {
        // ReferenceHandler.Preserve wraps arrays as { "$values": [...] }
        const raw = response?.items?.$values ?? response?.items ?? [];
        const items: ServiceBrowseDto[] = Array.isArray(raw) ? raw : [];
        return {
          items,
          total:    response?.total    ?? 0,
          page:     response?.page     ?? 1,
          pageSize: response?.pageSize ?? 100,
        };
      })
    );
  }
}
