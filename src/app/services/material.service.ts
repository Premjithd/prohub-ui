import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Material, CreateMaterialRequest, UpdateMaterialRequest } from '../models/material.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MaterialService {
  private readonly base = `${environment.apiUrl}/materials`;

  constructor(private http: HttpClient) {}

  getMaterials(categoryId?: number, activeOnly = true): Observable<Material[]> {
    let params = new HttpParams();
    if (categoryId != null) params = params.set('categoryId', categoryId);
    if (!activeOnly) params = params.set('activeOnly', 'false');
    return this.http.get<Material[]>(this.base, { params });
  }

  getMaterial(id: number): Observable<Material> {
    return this.http.get<Material>(`${this.base}/${id}`);
  }

  createMaterial(request: CreateMaterialRequest): Observable<Material> {
    return this.http.post<Material>(this.base, request);
  }

  updateMaterial(id: number, request: UpdateMaterialRequest): Observable<Material> {
    return this.http.put<Material>(`${this.base}/${id}`, request);
  }

  deleteMaterial(id: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }
}
