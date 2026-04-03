// Material Models
export interface Material {
  id: number;
  name: string;
  description: string;
  unitPrice: number;
  serviceCategoryId: number;
  unit: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMaterialRequest {
  name: string;
  description: string;
  unitPrice: number;
  serviceCategoryId: number;
  unit: string;
}

export interface UpdateMaterialRequest {
  name?: string;
  description?: string;
  unitPrice?: number;
  unit?: string;
  isActive?: boolean;
}

export interface MaterialDto {
  id: number;
  name: string;
  description: string;
  unitPrice: number;
  serviceCategoryId: number;
  unit: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
