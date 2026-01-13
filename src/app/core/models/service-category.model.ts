export interface ServiceCategory {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  serviceCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
