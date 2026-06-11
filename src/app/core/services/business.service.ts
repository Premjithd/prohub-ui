import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PreRegisterBusinessRequest {
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

  updateBusiness(id: number, req: { businessName?: string; description?: string }): Observable<any> {
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
}
