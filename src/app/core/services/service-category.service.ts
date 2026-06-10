import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ServiceCategory } from '../models/service-category.model';

@Injectable({
  providedIn: 'root'
})
export class ServiceCategoryService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getCategories(): Observable<ServiceCategory[]> {
    console.log('📡 Calling API:', `${this.baseUrl}/serviceCategories`);
    return this.http.get<any>(`${this.baseUrl}/serviceCategories`).pipe(
      map(response => {
        console.log('📦 Raw API response:', response);
        console.log('Response type:', typeof response);
        console.log('Is array?', Array.isArray(response));
        
        // Handle wrapped response format with $values property (from ReferenceHandler.Preserve)
        if (response && response.$values && Array.isArray(response.$values)) {
          console.log('✅ Response uses $values format with', response.$values.length, 'items');
          return response.$values;
        }
        
        // Backend returns plain array directly
        if (Array.isArray(response)) {
          console.log('✅ Response is plain array with', response.length, 'items');
          return response;
        }
        
        // Or wrapped in data property
        if (response && response.data && Array.isArray(response.data)) {
          console.log('✅ Response is wrapped in data property with', response.data.length, 'items');
          return response.data;
        }
        
        console.warn('⚠️ Unknown response format, returning empty array');
        return [];
      }),
      catchError(error => {
        console.error('❌ API error:', error);
        console.error('Error details:', {
          status: error?.status,
          statusText: error?.statusText,
          message: error?.message,
          url: error?.url,
          headers: error?.headers
        });
        return of([]);
      })
    );
  }

  getCategory(id: number): Observable<ServiceCategory> {
    return this.http.get<ServiceCategory>(`${this.baseUrl}/serviceCategories/${id}`);
  }

  getAllCategories(): Observable<ServiceCategory[]> {
    return this.http.get<any>(`${this.baseUrl}/serviceCategories/all`).pipe(
      map(response => {
        if (response && response.$values && Array.isArray(response.$values)) return response.$values;
        if (Array.isArray(response)) return response;
        return [];
      }),
      catchError(() => of([]))
    );
  }

  createCategory(data: { name: string; description?: string; icon?: string }): Observable<ServiceCategory> {
    return this.http.post<ServiceCategory>(`${this.baseUrl}/serviceCategories`, data);
  }

  updateCategory(id: number, data: Partial<ServiceCategory>): Observable<ServiceCategory> {
    return this.http.put<ServiceCategory>(`${this.baseUrl}/serviceCategories/${id}`, { id, ...data });
  }
}
