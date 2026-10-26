import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PreRegisterBusinessRequest {
  businessId?: number | null;
  businessName: string;
  phone?: string;
  houseNameNumber?: string;
  street1?: string;
  street2?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  zipPostalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface CreateBusinessRequest {
  businessName: string;
  description?: string;
  phone?: string;
  houseNameNumber?: string;
  street1?: string;
  street2?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  zipPostalCode?: string;
  latitude?: number | null;
  longitude?: number | null;
  migrateSoloServices?: boolean;
}

export interface BusinessSummary {
  id: number;
  businessName: string;
  description?: string;
  status: string;
  serviceRadiusKm?: number | null;
  role: string;
  joinedAt: string;
  address?: {
    street1?: string;
    city?: string;
    state?: string;
    country?: string;
    zipPostalCode?: string;
  };
  memberCount: number;
}

export interface BusinessMember {
  id: number;
  proId: number;
  proName?: string;
  proEmail?: string;
  role: string;
  joinedAt: string;
}

export interface BusinessServiceDto {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  serviceCategoryId?: number | null;
  categoryName?: string | null;
  categoryIcon?: string | null;
  proId: number;
  proName?: string | null;
}

export interface BusinessServiceRequest {
  name: string;
  description: string;
  price: number;
  imageUrl?: string | null;
  serviceCategoryId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class BusinessService {
  private base = `${environment.apiUrl}/businesses`;

  constructor(private http: HttpClient) {}

  preRegisterBusiness(req: PreRegisterBusinessRequest): Observable<{ businessId: number }> {
    return this.http.post<{ businessId: number }>(`${this.base}/pre-register`, req);
  }

  getMyBusinesses(): Observable<BusinessSummary[]> {
    return this.http.get<BusinessSummary[]>(`${this.base}/mine`);
  }

  getBusiness(id: number): Observable<any> {
    return this.http.get<any>(`${this.base}/${id}`);
  }

  createBusiness(req: CreateBusinessRequest): Observable<{ id: number; businessName: string }> {
    return this.http.post<{ id: number; businessName: string }>(this.base, req);
  }

  updateBusiness(id: number, req: { businessName?: string; description?: string; serviceRadiusKm?: number }): Observable<any> {
    return this.http.put<any>(`${this.base}/${id}`, req);
  }

  getMembers(id: number): Observable<BusinessMember[]> {
    return this.http.get<BusinessMember[]>(`${this.base}/${id}/members`);
  }

  addMember(id: number, email: string, role?: string): Observable<any> {
    return this.http.post<any>(`${this.base}/${id}/members`, { email, role });
  }

  removeMember(businessId: number, membershipId: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/${businessId}/members/${membershipId}`);
  }

  migrateServices(id: number): Observable<{ migrated: number }> {
    return this.http.post<{ migrated: number }>(`${this.base}/${id}/migrate-services`, {});
  }

  // ── Business service offerings ──────────────────────────────────────────

  getBusinessServices(id: number): Observable<BusinessServiceDto[]> {
    return this.http.get<BusinessServiceDto[]>(`${this.base}/${id}/services`);
  }

  createBusinessService(id: number, req: BusinessServiceRequest): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.base}/${id}/services`, req);
  }

  updateBusinessService(id: number, serviceId: number, req: BusinessServiceRequest): Observable<void> {
    return this.http.put<void>(`${this.base}/${id}/services/${serviceId}`, req);
  }

  deleteBusinessService(id: number, serviceId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}/services/${serviceId}`);
  }
}
