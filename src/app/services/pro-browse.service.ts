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
  district?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  serviceRadiusKm?: number;
  isEmailVerified: boolean;
  services?: Array<{ id: number; name: string; price: number }>;
}

export interface BrowseProResult {
  total: number;
  page: number;
  pageSize: number;
  items: BrowsePro[];
}

export interface BrowseProParams {
  search?: string;
  categoryId?: number | null;
  country?: string;
  state?: string;
  district?: string;
  pinCode?: string;
  page?: number;
  pageSize?: number;
}

function unwrap(val: any): any[] {
  return Array.isArray(val) ? val : (val?.$values ?? []);
}

@Injectable({ providedIn: 'root' })
export class ProBrowseService {
  private base = `${environment.apiUrl}/pros/browse`;

  constructor(private http: HttpClient) {}

  browse(params?: BrowseProParams): Observable<BrowseProResult> {
    let p = new HttpParams();
    if (params?.search)      p = p.set('search',     params.search);
    if (params?.categoryId)  p = p.set('categoryId', params.categoryId.toString());
    if (params?.country)     p = p.set('country',    params.country);
    if (params?.state)       p = p.set('state',      params.state);
    if (params?.district)    p = p.set('district',   params.district);
    if (params?.pinCode)     p = p.set('pinCode',    params.pinCode);
    if (params?.page)        p = p.set('page',       params.page.toString());
    if (params?.pageSize)    p = p.set('pageSize',   params.pageSize.toString());

    return this.http.get<any>(this.base, { params: p }).pipe(
      map(res => ({
        total:    res.total    ?? 0,
        page:     res.page     ?? 1,
        pageSize: res.pageSize ?? 10,
        items: unwrap(res.items).map((pro: any) => ({
          ...pro,
          services: unwrap(pro.services)
        })) as BrowsePro[]
      }))
    );
  }
}
