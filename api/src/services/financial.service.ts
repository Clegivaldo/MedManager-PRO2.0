import { getTenantPrisma } from '../lib/tenant-prisma.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/errors.js';

interface CreateTransactionData {
    type: 'RECEIVABLE' | 'PAYABLE';
    description: string;
    value: number;
    dueDate: string;
    category?: string;
    client?: string;
    supplier?: string;
    notes?: string;
}

interface ListTransactionsParams {
    page: number;
    limit: number;
    type?: 'RECEIVABLE' | 'PAYABLE';
    status?: string;
    startDate?: string;
    endDate?: string;
}

/**
 * Serviço de gerenciamento financeiro
 */
class FinancialService {
    /**
     * Buscar resumo financeiro
     */
    async getSummary(tenantId: string) {
        const prisma: any = await getTenantPrisma(tenantId);

        const transactions = await prisma.financialTransaction.findMany({
            where: { status: { not: 'CANCELLED' } }
        });

        const summary = {
            totalReceivable: 0,
            totalPayable: 0,
            pendingReceivable: 0,
            pendingPayable: 0,
            overdueReceivable: 0,
            overduePayable: 0,
        };

        const now = new Date();

        transactions.forEach((t: any) => {
            const val = Number(t.value);
            const isOverdue = new Date(t.dueDate) < now && t.status === 'PENDING';

            if (t.type === 'RECEIVABLE') {
                summary.totalReceivable += val;
                if (t.status === 'PENDING') {
                    summary.pendingReceivable += val;
                    if (isOverdue) summary.overdueReceivable += val;
                }
            } else {
                summary.totalPayable += val;
                if (t.status === 'PENDING') {
                    summary.pendingPayable += val;
                    if (isOverdue) summary.overduePayable += val;
                }
            }
        });

        return summary;
    }

    /**
     * Listar transações
     */
    async listTransactions(tenantId: string, params: ListTransactionsParams) {
        const prisma: any = await getTenantPrisma(tenantId);

        const { page, limit, type, status, startDate, endDate } = params;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (type) where.type = type;
        if (status) where.status = status;
        if (startDate || endDate) {
            where.dueDate = {};
            if (startDate) where.dueDate.gte = new Date(startDate);
            if (endDate) where.dueDate.lte = new Date(endDate);
        }

        const [transactions, total] = await Promise.all([
            prisma.financialTransaction.findMany({
                where,
                skip,
                take: limit,
                orderBy: { dueDate: 'asc' }
            }),
            prisma.financialTransaction.count({ where })
        ]);

        return {
            transactions,
            total,
            page,
            limit,
        };
    }

    /**
     * Buscar dados de fluxo de caixa
     */
    async getCashFlow(tenantId: string, params: { startDate?: string; endDate?: string }) {
        const prisma: any = await getTenantPrisma(tenantId);

        const where: any = { status: 'PAID' };
        if (params.startDate || params.endDate) {
            where.paymentDate = {};
            if (params.startDate) where.paymentDate.gte = new Date(params.startDate);
            if (params.endDate) where.paymentDate.lte = new Date(params.endDate);
        }

        const paidTransactions = await prisma.financialTransaction.findMany({
            where,
            orderBy: { paymentDate: 'asc' }
        });

        // Agrupar por data
        const flowMap = new Map<string, { date: string, income: number, expense: number, balance: number }>();

        paidTransactions.forEach((t: any) => {
            const date = new Date(t.paymentDate).toISOString().split('T')[0];
            const current = flowMap.get(date) || { date, income: 0, expense: 0, balance: 0 };

            const val = Number(t.value);
            if (t.type === 'RECEIVABLE') {
                current.income += val;
            } else {
                current.expense += val;
            }
            current.balance = current.income - current.expense;
            flowMap.set(date, current);
        });

        return Array.from(flowMap.values());
    }

    /**
     * Criar nova transação
     */
    async createTransaction(tenantId: string, data: CreateTransactionData) {
        const prisma: any = await getTenantPrisma(tenantId);

        const transaction = await prisma.financialTransaction.create({
            data: {
                ...data,
                dueDate: new Date(data.dueDate),
                status: 'PENDING'
            }
        });

        logger.info(`Transaction created: ${transaction.id} for tenant ${tenantId}`);

        return transaction;
    }

    /**
     * Atualizar transação
     */
    async updateTransaction(tenantId: string, id: string, data: Partial<CreateTransactionData>) {
        const prisma: any = await getTenantPrisma(tenantId);

        const updateData: any = { ...data };
        if (data.dueDate) updateData.dueDate = new Date(data.dueDate);

        const transaction = await prisma.financialTransaction.update({
            where: { id },
            data: updateData
        });

        return transaction;
    }

    /**
     * Marcar como pago
     */
    async markAsPaid(tenantId: string, id: string, paymentDate?: string) {
        const prisma: any = await getTenantPrisma(tenantId);

        await prisma.financialTransaction.update({
            where: { id },
            data: {
                status: 'PAID',
                paymentDate: paymentDate ? new Date(paymentDate) : new Date()
            }
        });

        logger.info(`Transaction ${id} marked as paid for tenant ${tenantId}`);
    }

    /**
     * Cancelar transação
     */
    async cancelTransaction(tenantId: string, id: string) {
        const prisma: any = await getTenantPrisma(tenantId);

        await prisma.financialTransaction.update({
            where: { id },
            data: { status: 'CANCELLED' }
        });

        logger.info(`Transaction ${id} cancelled for tenant ${tenantId}`);
    }
}

export const financialService = new FinancialService();
