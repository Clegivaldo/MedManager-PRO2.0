import api, { ApiResponse } from './api';

export interface Warehouse {
    id: string;
    name: string;
    code: string;
    description?: string | null;
    address?: string | null;
    temperatureMin?: number | null;
    temperatureMax?: number | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    _count?: {
        stock: number;
        temperatureReadings: number;
    };
    temperatureReadings?: TemperatureReading[];
}

export interface TemperatureReading {
    id: string;
    warehouseId: string;
    temperature: number;
    humidity?: number | null;
    recordedBy?: string | null;
    recordedAt: string;
    isAlert: boolean;
    alertMessage?: string | null;
    warehouse?: Warehouse;
}

export interface WarehouseFilters {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'inactive';
}

export interface WarehouseFormData {
    name: string;
    code: string;
    description?: string;
    address?: string;
    temperatureMin?: number;
    temperatureMax?: number;
}

class WarehouseService {
    async list(filters: WarehouseFilters = {}) {
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.status) params.append('status', filters.status);

        const response = await api.get<ApiResponse<{
            warehouses: Warehouse[];
            pagination: { page: number; limit: number; total: number; pages: number };
        }>>(`/warehouses?${params.toString()}`);
        return response.data;
    }

    async getById(id: string) {
        const response = await api.get<ApiResponse<Warehouse>>(`/warehouses/${id}`);
        return response.data;
    }

    async create(data: WarehouseFormData) {
        const response = await api.post<ApiResponse<Warehouse>>('/warehouses', data);
        return response.data;
    }

    async update(id: string, data: Partial<WarehouseFormData>) {
        const response = await api.put<ApiResponse<Warehouse>>(`/warehouses/${id}`, data);
        return response.data;
    }

    async delete(id: string) {
        const response = await api.delete<ApiResponse<Warehouse>>(`/warehouses/${id}`);
        return response.data;
    }
}

export default new WarehouseService();
