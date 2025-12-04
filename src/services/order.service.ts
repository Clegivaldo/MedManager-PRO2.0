import api from './api';

export interface Order {
    id: string;
    customerId: string;
    customer?: {
        id: string;
        companyName: string;
        cnpjCpf: string;
    };
    status: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
    totalValue: number;
    paymentMethod?: string;
    deliveryDate?: string;
    notes?: string;
    items?: OrderItem[];
    createdAt: string;
    updatedAt: string;
}

export interface OrderItem {
    id: string;
    orderId: string;
    productId: string;
    product?: {
        id: string;
        name: string;
    };
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface CreateOrderDTO {
    customerId: string;
    items: {
        productId: string;
        quantity: number;
        unitPrice: number;
    }[];
    paymentMethod?: string;
    deliveryDate?: string;
    notes?: string;
}

export interface UpdateOrderDTO {
    status?: 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
    deliveryDate?: string;
    notes?: string;
}

class OrderService {
    async list(params?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
    }) {
        const response = await api.get('/orders', { params });
        return response.data;
    }

    async getById(id: string) {
        const response = await api.get(`/orders/${id}`);
        return response.data;
    }

    async create(data: CreateOrderDTO) {
        const response = await api.post('/orders', data);
        return response.data;
    }

    async update(id: string, data: UpdateOrderDTO) {
        const response = await api.put(`/orders/${id}`, data);
        return response.data;
    }

    async delete(id: string) {
        await api.delete(`/orders/${id}`);
    }
}

export default new OrderService();
