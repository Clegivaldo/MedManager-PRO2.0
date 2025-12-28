import api, { ApiResponse } from './api';

export interface Product {
  id: string;
  name: string;
  internalCode: string;
  gtin?: string | null;
  anvisaCode?: string | null;
  activeIngredient?: string | null;
  laboratory?: string | null;
  therapeuticClass?: string | null;
  productType: 'COMMON' | 'GENERIC' | 'SIMILAR' | 'REFERENCE';
  storage?: string | null;
  isControlled: boolean;
  controlledSubstance?: string | null;
  stripe: 'NONE' | 'BLACK' | 'RED';
  shelfLifeDays?: number | null;
  price?: number;
  stock?: number;
  // Campos fiscais
  ncm?: string | null;
  cest?: string | null;
  cfop?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  batches?: any[];
  compliance?: {
    hasValidRegistration: boolean;
    hasValidBatch: boolean;
    hasStock: boolean;
    requiresControlledSubstanceLicense: boolean;
    temperatureControlled: boolean;
    rdc430Compliant: boolean;
  };
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: 'active' | 'inactive';
}

export interface ProductFormData {
  name: string;
  internalCode: string;
  gtin?: string;
  anvisaCode?: string;
  activeIngredient?: string;
  laboratory?: string;
  therapeuticClass?: string;
  productType?: 'COMMON' | 'GENERIC' | 'SIMILAR' | 'REFERENCE';
  storage?: string;
  isControlled?: boolean;
  controlledSubstance?: string;
  stripe?: 'NONE' | 'BLACK' | 'RED';
  shelfLifeDays?: number;
  // Campos fiscais
  ncm?: string;
  cest?: string;
  cfop?: string;
  isActive?: boolean;
}

class ProductService {
  async list(filters?: ProductFilters) {
    const response = await api.get<ApiResponse<{
      products: Product[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>>('/products', { params: filters });

    return response.data.data;
  }

  async getById(id: string) {
    const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data.data;
  }

  async create(data: ProductFormData) {
    const response = await api.post<ApiResponse<Product>>('/products', data);
    return response.data.data;
  }

  async update(id: string, data: Partial<ProductFormData>) {
    const response = await api.put<ApiResponse<Product>>(`/products/${id}`, data);
    return response.data.data;
  }
}

export default new ProductService();
