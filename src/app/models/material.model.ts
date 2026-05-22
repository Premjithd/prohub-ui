export interface Material {
  id: number;
  serviceCategoryId: number;
  categoryName?: string;
  name: string;
  brand?: string;
  description?: string;
  unitPrice: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateMaterialRequest {
  serviceCategoryId: number;
  name: string;
  brand?: string;
  description?: string;
  unitPrice: number;
}

export interface UpdateMaterialRequest {
  name?: string;
  brand?: string;
  description?: string;
  unitPrice?: number;
  isActive?: boolean;
}
