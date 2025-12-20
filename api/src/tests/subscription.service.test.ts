import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SubscriptionService, CreateSubscriptionDto } from '../services/subscription.service';
import { addMonths, addYears, subDays, addDays } from 'date-fns';

describe('SubscriptionService', () => {
    let subscriptionService: SubscriptionService;
    let mockPrisma: any;

    beforeEach(() => {
        mockPrisma = {
            plan: {
                findUnique: vi.fn(),
            },
            subscription: {
                findUnique: vi.fn(),
                create: vi.fn(),
                update: vi.fn(),
                findMany: vi.fn(),
            },
            tenant: {
                update: vi.fn(),
            },
        };
        subscriptionService = new SubscriptionService(mockPrisma);
        vi.clearAllMocks();
    });

    describe('createSubscription', () => {
        const dto: CreateSubscriptionDto = {
            tenantId: 'tenant-1',
            planId: 'plan-1',
            billingCycle: 'monthly',
        };

        it('should create a subscription successfully', async () => {
            const mockPlan = { id: 'plan-1', name: 'Premium', isActive: true, features: ['DASHBOARD'] };
            mockPrisma.plan.findUnique.mockResolvedValue(mockPlan);
            mockPrisma.subscription.findUnique.mockResolvedValue(null);
            mockPrisma.subscription.create.mockResolvedValue({ id: 'sub-1', ...dto });

            const result = await subscriptionService.createSubscription(dto);

            expect(mockPrisma.plan.findUnique).toHaveBeenCalledWith({ where: { id: 'plan-1' } });
            expect(mockPrisma.subscription.create).toHaveBeenCalled();
            expect(mockPrisma.tenant.update).toHaveBeenCalled();
            expect(result.id).toBe('sub-1');
        });

        it('should throw error if plan not found', async () => {
            mockPrisma.plan.findUnique.mockResolvedValue(null);
            await expect(subscriptionService.createSubscription(dto)).rejects.toThrow('Plano não encontrado');
        });

        it('should throw error if plan is not active', async () => {
            mockPrisma.plan.findUnique.mockResolvedValue({ id: 'plan-1', isActive: false });
            await expect(subscriptionService.createSubscription(dto)).rejects.toThrow('Plano não está ativo');
        });

        it('should throw error if tenant already has a subscription', async () => {
            mockPrisma.plan.findUnique.mockResolvedValue({ id: 'plan-1', isActive: true });
            mockPrisma.subscription.findUnique.mockResolvedValue({ id: 'existing-sub' });
            await expect(subscriptionService.createSubscription(dto)).rejects.toThrow('Tenant já possui uma assinatura');
        });
    });

    describe('renewSubscription', () => {
        it('should renew an active subscription extending from current end date', async () => {
            const futureDate = addDays(new Date(), 10);
            const mockSub = {
                tenantId: 'tenant-1',
                endDate: futureDate,
                plan: { name: 'Premium' }
            };
            mockPrisma.subscription.findUnique.mockResolvedValue(mockSub);
            mockPrisma.subscription.update.mockResolvedValue({ ...mockSub, endDate: addMonths(futureDate, 1) });

            await subscriptionService.renewSubscription('tenant-1', { months: 1 });

            const updateCall = mockPrisma.subscription.update.mock.calls[0][0];
            expect(updateCall.data.endDate.getTime()).toBeGreaterThan(futureDate.getTime());
        });

        it('should renew an expired subscription starting from today', async () => {
            const pastDate = subDays(new Date(), 10);
            const mockSub = {
                tenantId: 'tenant-1',
                endDate: pastDate,
                plan: { name: 'Premium' }
            };
            mockPrisma.subscription.findUnique.mockResolvedValue(mockSub);
            mockPrisma.subscription.update.mockResolvedValue({ ...mockSub, endDate: addMonths(new Date(), 1) });

            await subscriptionService.renewSubscription('tenant-1', { months: 1 });

            const updateCall = mockPrisma.subscription.update.mock.calls[0][0];
            // Should be roughly 1 month from now, definitely after the old pastDate
            expect(updateCall.data.endDate.getTime()).toBeGreaterThan(new Date().getTime());
        });
    });

    describe('checkValidity', () => {
        it('should return isValid true for active subscription within date', async () => {
            const futureDate = addDays(new Date(), 5);
            mockPrisma.subscription.findUnique.mockResolvedValue({
                status: 'active',
                endDate: futureDate
            });

            const result = await subscriptionService.checkValidity('tenant-1');
            expect(result.isValid).toBe(true);
        });

        it('should return isValid false and update status if expired', async () => {
            const pastDate = subDays(new Date(), 5);
            mockPrisma.subscription.findUnique.mockResolvedValue({
                status: 'active',
                endDate: pastDate
            });

            const result = await subscriptionService.checkValidity('tenant-1');
            expect(result.isValid).toBe(false);
            expect(result.reason).toBe('Assinatura expirada');
            expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
                where: { tenantId: 'tenant-1' },
                data: { status: 'expired' }
            });
        });

        it('should return isValid false if suspended', async () => {
            const futureDate = addDays(new Date(), 5);
            mockPrisma.subscription.findUnique.mockResolvedValue({
                status: 'suspended',
                endDate: futureDate
            });

            const result = await subscriptionService.checkValidity('tenant-1');
            expect(result.isValid).toBe(false);
            expect(result.reason).toBe('Assinatura suspensa');
        });
    });

    describe('reactivateSubscription', () => {
        it('should reactivate a suspended subscription as active if not expired', async () => {
            const futureDate = addDays(new Date(), 5);
            mockPrisma.subscription.findUnique.mockResolvedValue({
                status: 'suspended',
                endDate: futureDate
            });

            await subscriptionService.reactivateSubscription('tenant-1');

            expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
                where: { tenantId: 'tenant-1' },
                data: { status: 'active' }
            });
        });

        it('should reactivate a suspended subscription as expired if date passed', async () => {
            const pastDate = subDays(new Date(), 5);
            mockPrisma.subscription.findUnique.mockResolvedValue({
                status: 'suspended',
                endDate: pastDate
            });

            await subscriptionService.reactivateSubscription('tenant-1');

            expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
                where: { tenantId: 'tenant-1' },
                data: { status: 'expired' }
            });
        });
    });

    describe('getSubscriptionInfo', () => {
        it('should calculate days until expiration correctly', async () => {
            const fiveDaysFromNow = addDays(new Date(), 5);
            // Ensure we don't have millisecond issues by normalizing a bit if needed, 
            // but Math.ceil should handle it.
            mockPrisma.subscription.findUnique.mockResolvedValue({
                endDate: fiveDaysFromNow,
                plan: { name: 'Pro' }
            });

            const result = await subscriptionService.getSubscriptionInfo('tenant-1');
            expect(result.daysUntilExpiration).toBe(5);
            expect(result.isExpiringSoon).toBe(true);
        });

        it('should return isExpired true if in the past', async () => {
            const pastDate = subDays(new Date(), 2);
            mockPrisma.subscription.findUnique.mockResolvedValue({
                endDate: pastDate,
                plan: { name: 'Pro' }
            });

            const result = await subscriptionService.getSubscriptionInfo('tenant-1');
            expect(result.isExpired).toBe(true);
            expect(result.daysUntilExpiration).toBeLessThan(0);
        });
    });
});
