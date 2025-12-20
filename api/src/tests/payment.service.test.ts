import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService } from '../services/payment/payment.service.js';
import { AsaasGateway } from '../services/payment/AsaasGateway.js';
import { InfinityPayGateway } from '../services/payment/InfinityPayGateway.js';
import { GlobalPaymentConfigService } from '../services/payment/globalPaymentConfig.service.js';

vi.mock('../services/payment/AsaasGateway.js');
vi.mock('../services/payment/InfinityPayGateway.js');
vi.mock('../services/payment/globalPaymentConfig.service.js');

describe('PaymentService', () => {
    let paymentService: PaymentService;
    let mockPrisma: any;
    let mockGlobalCfg: any;

    beforeEach(() => {
        mockPrisma = {
            tenant: { findUnique: vi.fn(), update: vi.fn() },
            payment: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
            subscription: { findUnique: vi.fn(), update: vi.fn() },
        };

        paymentService = new PaymentService(mockPrisma);
        mockGlobalCfg = (paymentService as any).globalCfg;

        vi.clearAllMocks();
    });

    describe('createCharge', () => {
        it('should create a charge using Asaas by default', async () => {
            mockGlobalCfg.getFullConfig.mockResolvedValue({
                activeGateway: 'asaas',
                asaasApiKey: 'key-123',
            });
            mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', name: 'Tenant 1', cnpj: '123' });

            vi.mocked(AsaasGateway.prototype.createCharge).mockResolvedValue({
                id: 'external-1',
                status: 'pending',
                value: 100,
                dueDate: '2024-12-31',
            });

            await paymentService.createCharge({
                tenantId: 't1', amount: 100, description: 'Test', paymentMethod: 'PIX'
            });

            expect(AsaasGateway).toHaveBeenCalled();
            expect(mockPrisma.payment.create).toHaveBeenCalled();
        });

        it('should create a charge using InfinityPay if configured', async () => {
            mockGlobalCfg.getFullConfig.mockResolvedValue({
                activeGateway: 'infinitypay',
                infinityPayApiKey: 'key-123',
                infinityPayMerchantId: 'm-123',
            });
            mockPrisma.tenant.findUnique.mockResolvedValue({ id: 't1', name: 'Tenant 1' });

            vi.mocked(InfinityPayGateway.prototype.createCharge).mockResolvedValue({
                id: 'inf-1',
                status: 'pending',
                value: 100,
                dueDate: '2024-12-31',
            });

            await paymentService.createCharge({
                tenantId: 't1', amount: 100, description: 'Test', paymentMethod: 'CREDIT_CARD'
            });

            expect(InfinityPayGateway).toHaveBeenCalled();
        });
    });

    describe('syncChargeStatus', () => {
        it('should extend subscription if status changes to confirmed', async () => {
            mockGlobalCfg.getFullConfig.mockResolvedValue({ asaasApiKey: 'k' });
            mockPrisma.payment.findUnique.mockResolvedValue({
                id: 'p1', tenantId: 't1', status: 'pending', gateway: 'asaas', gatewayChargeId: 'ext-1'
            });
            mockPrisma.subscription.findUnique.mockResolvedValue({
                tenantId: 't1', endDate: new Date('2024-01-01')
            });

            // Need to handle the instance created inside syncChargeStatus
            // Since it's a new instance, we might need to mock the prototype or use automock features
            const proto = AsaasGateway.prototype;
            vi.mocked(proto.getChargeStatus).mockResolvedValue({
                id: 'ext-1',
                status: 'confirmed',
                value: 100,
                dueDate: '2024-12-31'
            });

            await paymentService.syncChargeStatus('ext-1');

            expect(mockPrisma.payment.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ status: 'confirmed' })
            }));
        });
    });
});
