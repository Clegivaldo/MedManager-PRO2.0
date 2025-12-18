import api, { ApiResponse } from './api';

export interface Quote {
    id: string;
    quoteNumber: string;
    customerId: string;
    validUntil: string;
    totalAmount: number;
    status: 'pending' | 'sent' | 'approved' | 'rejected';
    notes?: string | null;
    createdAt: string;
    updatedAt: string;
    customer?: any;
    items?: QuoteItem[];
}

export interface QuoteItem {
    id: string;
    quoteId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    product?: any;
}

export interface QuoteFormData {
    customerId: string;
    validUntil: string;
    items: {
        productId: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
    }[];
    notes?: string;
}

export interface QuoteFilters {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
}

class QuoteService {
    async list(filters: QuoteFilters = {}) {
        const params = new URLSearchParams();
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.status) params.append('status', filters.status);

        const response = await api.get<ApiResponse<{
            quotes: Quote[];
            pagination: { page: number; limit: number; total: number; pages: number };
        }>>(`/quotes?${params.toString()}`);
        return response.data;
    }

    async getById(id: string) {
        const response = await api.get<ApiResponse<Quote>>(`/quotes/${id}`);
        return response.data;
    }

    async create(data: QuoteFormData) {
        const response = await api.post<ApiResponse<Quote>>('/quotes', data);
        return response.data;
    }

    async update(id: string, data: Partial<QuoteFormData>) {
        const response = await api.put<ApiResponse<Quote>>(`/quotes/${id}`, data);
        return response.data;
    }

    async delete(id: string) {
        const response = await api.delete<ApiResponse<void>>(`/quotes/${id}`);
        return response.data;
    }
}

export default new QuoteService();
