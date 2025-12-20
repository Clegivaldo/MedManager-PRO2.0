import { describe, it, expect, vi, beforeEach } from 'vitest';
import { financialService } from '../services/financial.service.js';
import { getTenantPrisma } from '../lib/tenant-prisma.js';

vi.mock('../lib/tenant-prisma.js', () => ({
    getTenantPrisma: vi.fn(),
}));

describe('FinancialService', () => {
    let mockPrisma: any;
    const tenantId = 'test-tenant';

    beforeEach(() => {
        mockPrisma = {
            financialTransaction: {
                findMany: vi.fn(),
                findUnique: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
                count: vi.fn(),
            },
        };
        (getTenantPrisma as any).mockResolvedValue(mockPrisma);
        vi.clearAllMocks();
    });

    describe('getSummary', () => {
        it('should list all non-cancelled transactions and calculate summary', async () => {
            const mockTransactions = [
                { type: 'RECEIVABLE', value: 1000, status: 'PENDING', dueDate: new Date('2025-01-01') },
                { type: 'RECEIVABLE', value: 500, status: 'PAID', dueDate: new Date('2024-01-01') },
                { type: 'PAYABLE', value: 300, status: 'PENDING', dueDate: new Date('2024-01-01') }, // Overdue
            ];
            mockPrisma.financialTransaction.findMany.mockResolvedValue(mockTransactions);

            const summary = await financialService.getSummary(tenantId);

            expect(summary.totalReceivable).toBe(1500);
            expect(summary.totalPayable).toBe(300);
            expect(summary.pendingReceivable).toBe(1000);
            expect(summary.pendingPayable).toBe(300);
            expect(summary.overduePayable).toBe(300);
        });
    });

    describe('createTransaction', () => {
        it('should create a transaction with PENDING status', async () => {
            const data = {
                type: 'RECEIVABLE' as const,
                description: 'Test',
                value: 100,
                dueDate: '2025-01-01'
            };

            mockPrisma.financialTransaction.create.mockResolvedValue({ id: 'new-id' });
            await financialService.createTransaction(tenantId, data);

            expect(mockPrisma.financialTransaction.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    status: 'PENDING',
                    value: 100
                })
            });
        });
    });

    describe('markAsPaid', () => {
        it('should update status to PAID and set paymentDate', async () => {
            const id = 'trans-1';
            await financialService.markAsPaid(tenantId, id);

            expect(mockPrisma.financialTransaction.update).toHaveBeenCalledWith({
                where: { id },
                data: expect.objectContaining({
                    status: 'PAID',
                    paymentDate: expect.any(Date)
                })
            });
        });
    });
});
