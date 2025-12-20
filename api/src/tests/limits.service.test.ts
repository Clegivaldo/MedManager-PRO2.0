import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LimitsService } from '../services/limits.service';
import { startOfMonth } from 'date-fns';

describe('LimitsService', () => {
    let limitsService: LimitsService;
    let mockPrisma: any;
    const FIXED_DATE = new Date('2024-03-01T12:00:00Z');

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(FIXED_DATE);
        mockPrisma = {
            subscription: {
                findUnique: vi.fn(),
            },
            usageMetrics: {
                findUnique: vi.fn(),
                create: vi.fn(),
                upsert: vi.fn(),
            },
        };
        limitsService = new LimitsService(mockPrisma);
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('getTenantLimits', () => {
        it('should return limits for a valid subscription', async () => {
            mockPrisma.subscription.findUnique.mockResolvedValue({
                plan: {
                    maxUsers: 5,
                    maxProducts: 100,
                    maxMonthlyTransactions: 1000,
                    maxStorageGb: 1,
                    maxApiCallsPerMinute: 60,
                }
            });

            const limits = await limitsService.getTenantLimits('tenant-1');
            expect(limits.maxUsers).toBe(5);
            expect(limits.maxProducts).toBe(100);
        });

        it('should throw error if no subscription found', async () => {
            mockPrisma.subscription.findUnique.mockResolvedValue(null);
            await expect(limitsService.getTenantLimits('tenant-1')).rejects.toThrow('Tenant não possui assinatura ativa');
        });
    });

    describe('checkUserLimit', () => {
        const mockLimits = { maxUsers: 2, maxProducts: 10, maxMonthlyTransactions: 10, maxStorageGb: 1, maxApiCallsPerMinute: 10 };

        it('should allow if usage is below limit', async () => {
            // Mock limits
            mockPrisma.subscription.findUnique.mockResolvedValue({ plan: mockLimits });
            // Mock current usage
            mockPrisma.usageMetrics.findUnique.mockResolvedValue({ userCount: 1 });

            const result = await limitsService.checkUserLimit('tenant-1');
            expect(result.allowed).toBe(true);
        });

        it('should disallow if usage reached limit', async () => {
            mockPrisma.subscription.findUnique.mockResolvedValue({ plan: mockLimits });
            mockPrisma.usageMetrics.findUnique.mockResolvedValue({ userCount: 2 });

            const result = await limitsService.checkUserLimit('tenant-1');
            expect(result.allowed).toBe(false);
            expect(result.limitType).toBe('users');
        });

        it('should allow if limit is unlimited (>= 999999)', async () => {
            mockPrisma.subscription.findUnique.mockResolvedValue({ plan: { ...mockLimits, maxUsers: 999999 } });
            mockPrisma.usageMetrics.findUnique.mockResolvedValue({ userCount: 1000 });

            const result = await limitsService.checkUserLimit('tenant-1');
            expect(result.allowed).toBe(true);
        });
    });

    describe('checkStorageLimit', () => {
        const mockLimits = { maxStorageGb: 1 }; // 1024 MB

        it('should allow if storage + additional is below limit', async () => {
            mockPrisma.subscription.findUnique.mockResolvedValue({ plan: mockLimits });
            mockPrisma.usageMetrics.findUnique.mockResolvedValue({ storageUsedMb: 500 });

            const result = await limitsService.checkStorageLimit('tenant-1', 100);
            expect(result.allowed).toBe(true);
        });

        it('should disallow if storage + additional exceeds limit', async () => {
            mockPrisma.subscription.findUnique.mockResolvedValue({ plan: mockLimits });
            mockPrisma.usageMetrics.findUnique.mockResolvedValue({ storageUsedMb: 900 });

            const result = await limitsService.checkStorageLimit('tenant-1', 200);
            expect(result.allowed).toBe(false);
            expect(result.limitType).toBe('storage');
        });
    });

    describe('trackTransaction', () => {
        it('should call upsert with increment logic', async () => {
            await limitsService.trackTransaction('tenant-1');

            expect(mockPrisma.usageMetrics.upsert).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        tenantId_period: {
                            tenantId: 'tenant-1',
                            period: startOfMonth(new Date()),
                        },
                    },
                    update: {
                        transactionCount: { increment: 1 },
                    },
                })
            );
        });
    });

    describe('getUsageDashboard', () => {
        it('should calculate statuses correctly (ok, warning, critical)', async () => {
            mockPrisma.subscription.findUnique.mockResolvedValue({
                plan: {
                    maxUsers: 10,
                    maxProducts: 100,
                    maxMonthlyTransactions: 1000,
                    maxStorageGb: 1,
                }
            });

            mockPrisma.usageMetrics.findUnique.mockResolvedValue({
                userCount: 2,         // 20% -> ok
                productCount: 85,     // 85% -> warning
                transactionCount: 950, // 95% -> critical
                storageUsedMb: 100,    // ~10% -> ok
            });

            const dashboard = await limitsService.getUsageDashboard('tenant-1');

            const userMetric = dashboard.metrics.find(m => m.name === 'Usuários');
            const productMetric = dashboard.metrics.find(m => m.name === 'Produtos');
            const transMetric = dashboard.metrics.find(m => m.name === 'Transações Mensais');

            expect(userMetric?.status).toBe('ok');
            expect(productMetric?.status).toBe('warning');
            expect(transMetric?.status).toBe('critical');
        });

        it('should handle unlimited values in dashboard', async () => {
            mockPrisma.subscription.findUnique.mockResolvedValue({
                plan: {
                    maxUsers: 999999,
                    maxProducts: 100,
                    maxMonthlyTransactions: 1000,
                    maxStorageGb: 1,
                }
            });
            mockPrisma.usageMetrics.findUnique.mockResolvedValue({ userCount: 50, productCount: 1, transactionCount: 1, storageUsedMb: 1 });

            const dashboard = await limitsService.getUsageDashboard('tenant-1');
            const userMetric = dashboard.metrics.find(m => m.name === 'Usuários');

            expect(userMetric?.limit).toBe('Ilimitado');
            expect(userMetric?.percentage).toBe(0);
            expect(userMetric?.status).toBe('ok');
        });
    });
});
