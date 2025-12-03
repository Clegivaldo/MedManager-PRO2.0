import api from './api';

export interface Invoice {
    id: string;
    amount: string;
    currency: string;
    paymentMethod: string;
    status: string;
    dueDate: string;
    paidAt?: string;
    createdAt: string;
    description: string;
}

export interface InvoiceSummary {
    totalPending: number;
    totalPaid: number;
}

export interface InvoicesResponse {
    invoices: Invoice[];
    summary: InvoiceSummary;
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface PaymentInfo {
    id: string;
    amount: string;
    status: string;
    dueDate: string;
    paymentMethod: string;
    pixQrCode?: string;
    pixQrCodeBase64?: string;
    boletoUrl?: string;
    boletoBarcode?: string;
}

export interface PaymentInfoResponse {
    paymentInfo: PaymentInfo;
}

class TenantBillingService {
    /**
     * Lista todas as faturas do tenant autenticado
     */
    async listInvoices(params?: {
        page?: number;
        limit?: number;
        status?: string;
    }): Promise<InvoicesResponse> {
        const response = await api.get('/tenant/billing/invoices', { params });
        return response.data;
    }

    /**
     * Obtém informações de pagamento para uma fatura específica
     */
    async getPaymentInfo(invoiceId: string): Promise<PaymentInfoResponse> {
        const response = await api.get(`/tenant/billing/invoices/${invoiceId}/payment-info`);
        return response.data;
    }

    /**
     * Formata valor monetário para exibição
     */
    formatCurrency(value: string | number): string {
        const numValue = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(numValue);
    }

    /**
     * Formata data para exibição
     */
    formatDate(date: string): string {
        return new Date(date).toLocaleDateString('pt-BR');
    }

    /**
     * Retorna badge de status formatado
     */
    getStatusBadge(status: string): {
        label: string;
        color: string;
        bgColor: string;
    } {
        const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
            confirmed: { label: 'Pago', color: 'text-green-700', bgColor: 'bg-green-100' },
            pending: { label: 'Pendente', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
            overdue: { label: 'Atrasado', color: 'text-red-700', bgColor: 'bg-red-100' },
            cancelled: { label: 'Cancelado', color: 'text-gray-700', bgColor: 'bg-gray-100' },
        };

        return statusMap[status] || { label: 'Desconhecido', color: 'text-gray-700', bgColor: 'bg-gray-100' };
    }

    /**
     * Verifica se uma fatura está vencida
     */
    isOverdue(dueDate: string, status: string): boolean {
        if (status === 'confirmed' || status === 'cancelled') return false;
        return new Date(dueDate) < new Date();
    }
}

export const tenantBillingService = new TenantBillingService();
export default tenantBillingService;
