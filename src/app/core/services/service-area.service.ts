import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ServiceArea {
  id: number;
  country: string;
  state?: string;
  district?: string;
  pinCode?: string;
  isActive: boolean;
  isAutoEnrolled: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ServiceAreaCreateRequest {
  country: string;
  state?: string;
  district?: string;
  pinCode?: string;
  isActive: boolean;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class ServiceAreaService {
  private readonly base = `${environment.apiUrl}/service-areas`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ServiceArea[]> {
    return this.http.get<ServiceArea[]>(this.base);
  }

  getActive(): Observable<ServiceArea[]> {
    return this.http.get<ServiceArea[]>(`${this.base}/active`);
  }

  add(area: ServiceAreaCreateRequest): Observable<ServiceArea> {
    return this.http.post<ServiceArea>(this.base, area);
  }

  toggle(id: number): Observable<{ id: number; isActive: boolean }> {
    return this.http.post<{ id: number; isActive: boolean }>(`${this.base}/${id}/toggle`, {});
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }

  check(country: string, state?: string, district?: string, pinCode?: string): Observable<{ inServiceArea: boolean }> {
    const params: any = { country };
    if (state) params['state'] = state;
    if (district) params['district'] = district;
    if (pinCode) params['pinCode'] = pinCode;
    return this.http.get<{ inServiceArea: boolean }>(`${this.base}/check`, { params });
  }
}
