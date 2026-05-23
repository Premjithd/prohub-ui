import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface BrowsePro {
  id: number;
  proName: string;
  businessName: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  serviceRadiusKm?: number;
  isEmailVerified: boolean;
  services?: Array<{ id: number; name: string; price: number }>;
}

function unwrap(response: any): any[] {
  return Array.isArray(response) ? response : (response?.$values ?? []);
}

@Injectable({ providedIn: 'root' })
export class ProBrowseService {
  private base = `${environment.apiUrl}/pros/browse`;

  constructor(private http: HttpClient) {}

  browse(search?: string, categoryId?: number | null): Observable<BrowsePro[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (categoryId) params = params.set('categoryId', categoryId.toString());
    return this.http.get<any>(this.base, { params }).pipe(
      map(response => {
        const items: any[] = unwrap(response);
        return items.map(p => ({
          ...p,
          // services may also be wrapped in $values by ReferenceHandler.Preserve
          services: unwrap(p.services)
        })) as BrowsePro[];
      })
    );
  }
}
