import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Material, CreateMaterialRequest, UpdateMaterialRequest, MaterialDto } from '../models/material.model';

@Injectable({
  providedIn: 'root'
})
export class MaterialService {
  private apiUrl = '/api/materials';

  constructor(private http: HttpClient) {}

  /**
   * Get all materials, optionally filtered by category and active status
   * @param serviceCategoryId Optional category ID to filter by
   * @param activeOnly Optional flag to get only active materials (default: true)
   * @returns Array of materials
   */
  getMaterials(serviceCategoryId?: number, activeOnly: boolean = true): Observable<Material[]> {
    let params = '';
    if (serviceCategoryId) {
      params += `?serviceCategoryId=${serviceCategoryId}`;
    }
    if (activeOnly) {
      params += params ? '&' : '?';
      params += 'activeOnly=true';
    }
    return this.http.get<Material[]>(`${this.apiUrl}${params}`);
  }

  /**
   * Get a single material by ID
   * @param id Material ID
   * @returns Material details
   */
  getMaterial(id: number): Observable<Material> {
    return this.http.get<Material>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create a new material
   * @param request Create material request with name, description, price, category
   * @returns Created material
   */
  createMaterial(request: CreateMaterialRequest): Observable<Material> {
    return this.http.post<Material>(this.apiUrl, request);
  }

  /**
   * Update an existing material
   * @param id Material ID
   * @param request Partial update request
   * @returns Updated material
   */
  updateMaterial(id: number, request: UpdateMaterialRequest): Observable<Material> {
    return this.http.put<Material>(`${this.apiUrl}/${id}`, request);
  }

  /**
   * Delete a material (soft delete - marks as inactive)
   * @param id Material ID
   * @returns Delete confirmation response
   */
  deleteMaterial(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * Get materials for a specific service category
   * @param serviceCategoryId Service category ID
   * @returns Array of materials in that category
   */
  getMaterialsByCategory(serviceCategoryId: number): Observable<Material[]> {
    return this.getMaterials(serviceCategoryId, true);
  }
}
