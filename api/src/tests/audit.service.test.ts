import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auditService } from '../services/audit.service.js';
import { getTenantPrisma } from '../lib/tenant-prisma.js';

vi.mock('../lib/tenant-prisma.js', () => ({
    getTenantPrisma: vi.fn(),
}));

describe('AuditService', () => {
    let mockPrisma: any;
    const tenantId = 'test-tenant';

    beforeEach(() => {
        mockPrisma = {
            tenantAuditLog: {
                findMany: vi.fn(),
                findUnique: vi.fn(),
                create: vi.fn(),
                count: vi.fn(),
            },
        };
        (getTenantPrisma as any).mockResolvedValue(mockPrisma);
        vi.clearAllMocks();
    });

    describe('log', () => {
        it('should create a new tenant audit log entry', async () => {
            const entry = {
                userId: 'u1',
                tableName: 'Product',
                operation: 'UPDATE',
                newData: { price: 10 }
            };

            await auditService.log(tenantId, entry);

            expect(mockPrisma.tenantAuditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    tableName: 'Product',
                    operation: 'UPDATE'
                })
            });
        });
    });

    describe('listLogs', () => {
        it('should list logs with user information included', async () => {
            mockPrisma.tenantAuditLog.findMany.mockResolvedValue([
                {
                    id: 'l1',
                    operation: 'CREATE',
                    user: { name: 'João' }
                }
            ]);
            mockPrisma.tenantAuditLog.count.mockResolvedValue(1);

            const result = await auditService.listLogs(tenantId, { page: 1, limit: 10 });

            expect(result.logs[0].userName).toBe('João');
            expect(mockPrisma.tenantAuditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
                include: expect.objectContaining({ user: expect.any(Object) })
            }));
        });
    });
});
