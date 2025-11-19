import api, { ApiResponse } from './api';

export interface Customer {
  id: string;
    companyName: string;
    tradeName?: string | null;
    cnpjCpf: string;
    customerType: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
    creditLimit?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
}

export interface CustomerFormData {
  companyName: string;
  tradeName?: string;
  cnpjCpf: string;
  customerType?: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit?: number;
  isActive?: boolean;
}

class CustomerService {
  async list(filters?: CustomerFilters) {
    const response = await api.get<ApiResponse<{
      customers: Customer[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>>('/customers', { params: filters });
    
    return response.data.data;
  }

  async getById(id: string) {
    const response = await api.get<ApiResponse<Customer>>(`/customers/${id}`);
    return response.data.data;
  }

  async create(data: CustomerFormData) {
    const response = await api.post<ApiResponse<Customer>>('/customers', data);
    return response.data.data;
  }

  async update(id: string, data: Partial<CustomerFormData>) {
    const response = await api.put<ApiResponse<Customer>>(`/customers/${id}`, data);
    return response.data.data;
  }

  async delete(id: string) {
    const response = await api.delete<ApiResponse<Customer>>(`/customers/${id}`);
    return response.data.data;
  }
}

export default new CustomerService();
