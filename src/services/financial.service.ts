// src/services/financial.service.ts
import api from './api';

export interface FinancialTransaction {
    id: string;
    type: 'RECEIVABLE' | 'PAYABLE';
    description: string;
    value: number;
    dueDate: string;
    status: 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    category?: string;
    client?: string;
    supplier?: string;
    paymentDate?: string;
    createdAt: string;
}

export interface CashFlowData {
    date: string;
    income: number;
    expense: number;
    balance: number;
}

export interface FinancialSummary {
    totalReceivable: number;
    totalPayable: number;
    pendingReceivable: number;
    pendingPayable: number;
    overdueReceivable: number;
    overduePayable: number;
}

export interface CreateTransactionDTO {
    type: 'RECEIVABLE' | 'PAYABLE';
    description: string;
    value: number;
    dueDate: string;
    category?: string;
    client?: string;
    supplier?: string;
}

class FinancialService {
    /**
     * Buscar resumo financeiro
     */
    async getSummary(): Promise<FinancialSummary> {
        const response = await api.get('/financial/summary');
        return response.data.data;
    }

    /**
     * Listar transações
     */
    async listTransactions(params?: {
        page?: number;
        limit?: number;
        type?: 'RECEIVABLE' | 'PAYABLE';
        status?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<{
        transactions: FinancialTransaction[];
        total: number;
        page: number;
        limit: number;
    }> {
        const response = await api.get('/financial/transactions', { params });
        return response.data;
    }

    /**
     * Buscar dados de fluxo de caixa
     */
    async getCashFlow(params?: {
        startDate?: string;
        endDate?: string;
    }): Promise<CashFlowData[]> {
        const response = await api.get('/financial/cashflow', { params });
        return response.data.data;
    }

    /**
     * Criar nova transação
     */
    async createTransaction(data: CreateTransactionDTO): Promise<FinancialTransaction> {
        const response = await api.post('/financial/transactions', data);
        return response.data.data;
    }

    /**
     * Atualizar transação
     */
    async updateTransaction(id: string, data: Partial<CreateTransactionDTO>): Promise<FinancialTransaction> {
        const response = await api.put(`/financial/transactions/${id}`, data);
        return response.data.data;
    }

    /**
     * Marcar como pago
     */
    async markAsPaid(id: string, paymentDate?: string): Promise<void> {
        await api.put(`/financial/transactions/${id}/pay`, { paymentDate });
    }

    /**
     * Cancelar transação
     */
    async cancelTransaction(id: string): Promise<void> {
        await api.delete(`/financial/transactions/${id}`);
    }
}

export default new FinancialService();
