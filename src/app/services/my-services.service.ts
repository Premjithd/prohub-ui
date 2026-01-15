import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ServiceCategory {
  id: number;
  name: string;
  icon: string;
}

export interface Service {
  id: number;
  name: string;
  description: string;
  price: number;
  proId: number;
  createdAt: string;
  updatedAt: string;
  serviceCategoryId?: number;
  serviceCategory?: ServiceCategory;
}

@Injectable({
  providedIn: 'root'
})
export class MyServicesService {
  private apiUrl = `${environment.apiUrl}/services`;

  constructor(private http: HttpClient) {}

  // Get services for the current pro user by their ID
  getMyServices(proId: number): Observable<Service[]> {
    return this.http.get<any>(`${this.apiUrl}/pro/${proId}`).pipe(
      map(response => {
        console.log('Raw API response from getMyServices:', response);
        console.log('Response type:', typeof response);
        console.log('Is array?', Array.isArray(response));
        
        // Handle ReferenceHandler.Preserve format with $values
        if (response && response.$values && Array.isArray(response.$values)) {
          console.log('Response uses $values format with', response.$values.length, 'items');
          return response.$values;
        }
        
        // Handle direct array response
        if (Array.isArray(response)) {
          console.log('Response is a direct array with', response.length, 'items');
          return response;
        }
        
        // If response has a data property, use that
        if (response && Array.isArray(response.data)) {
          console.log('Response is wrapped with data property, contains', response.data.length, 'items');
          return response.data;
        }
        
        console.log('Response format not recognized, returning empty array');
        return [];
      })
    );
  }

  // Get a single service by ID
  getService(id: number): Observable<Service> {
    return this.http.get<Service>(`${this.apiUrl}/${id}`);
  }

  // Delete a service
  deleteService(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Update a service
  updateService(id: number, service: { name: string; description: string; price: number; proId: number; serviceCategoryId?: number | null }): Observable<Service> {
    return this.http.put<Service>(`${this.apiUrl}/${id}`, service);
  }

  // Create a new service
  createService(serviceData: { name: string; description: string; price: number; proId: number; serviceCategoryId: number }): Observable<Service> {
    return this.http.post<Service>(this.apiUrl, serviceData);
  }
}
