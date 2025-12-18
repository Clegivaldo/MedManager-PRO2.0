import api, { ApiResponse } from './api';

export interface DeliveryRoute {
    id: string;
    routeNumber: string;
    driverName: string;
    vehiclePlate: string;
    plannedDate: string;
    status: 'planning' | 'in_transit' | 'completed';
    totalStops: number;
    completedStops: number;
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
    stops?: RouteStop[];
}

export interface RouteStop {
    id: string;
    routeId: string;
    orderId: string;
    stopSequence: number;
    customerAddress: string;
    isCompleted: boolean;
    completedAt?: string | null;
    order?: any;
}

export interface DeliveryRouteFormData {
    driverName: string;
    vehiclePlate: string;
    plannedDate: string;
    orderIds: string[];
    notes?: string;
}

export interface DeliveryRouteFilters {
    page?: number;
    limit?: number;
    status?: string;
    date?: string;
}

class DeliveryRouteService {
    async list(filters: DeliveryRouteFilters = {}) {
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.status) params.append('status', filters.status);
        if (filters.date) params.append('date', filters.date);

        const response = await api.get<ApiResponse<{
            routes: DeliveryRoute[];
            pagination: { page: number; limit: number; total: number; pages: number };
        }>>(`/delivery-routes?${params.toString()}`);
        return response.data;
    }

    async getById(id: string) {
        const response = await api.get<ApiResponse<DeliveryRoute>>(`/delivery-routes/${id}`);
        return response.data;
    }

    async create(data: DeliveryRouteFormData) {
        const response = await api.post<ApiResponse<DeliveryRoute>>('/delivery-routes', data);
        return response.data;
    }

    async update(id: string, data: Partial<DeliveryRouteFormData>) {
        const response = await api.put<ApiResponse<DeliveryRoute>>(`/delivery-routes/${id}`, data);
        return response.data;
    }

    async completeStop(routeId: string, stopId: string) {
        const response = await api.put<ApiResponse<void>>(`/delivery-routes/${routeId}/stops/${stopId}/complete`);
        return response.data;
    }
}

export default new DeliveryRouteService();
