import pkg from '@prisma/client';
import type { PrismaClient as PrismaClientType } from '@prisma/client';
const PrismaClientRuntime = (pkg as any).PrismaClient as any;
import { AppError } from '../../utils/errors.js';
import { GlobalPaymentConfigService } from './globalPaymentConfig.service.js';
import { PaymentGateway, CreateChargeParams, ChargeResponse } from './PaymentGateway.interface.js';
import { AsaasGateway } from './AsaasGateway.js';
import { InfinityPayGateway } from './InfinityPayGateway.js';

export class PaymentService {
    private globalCfg: GlobalPaymentConfigService;

    constructor(private prisma: PrismaClientType) {
        this.globalCfg = new GlobalPaymentConfigService(prisma);
    }

    private async getGateway(): Promise<{ gateway: PaymentGateway; providerName: string }> {
        const config = await this.globalCfg.getFullConfig();

        if (config.activeGateway === 'infinitypay') {
            if (!config.infinityPayApiKey || !config.infinityPayMerchantId) {
                throw new AppError('InfinityPay não configurado corretamente', 500);
            }
            return {
                gateway: new InfinityPayGateway({
                    apiKey: config.infinityPayApiKey,
                    secretKey: config.infinityPayMerchantId // Assuming MerchantId is used as secret or similar
                }),
                providerName: 'infinitypay'
            };
        } else {
            // Default to Asaas
            if (!config.asaasApiKey) {
                throw new AppError('Asaas não configurado', 500);
            }
            return {
                gateway: new AsaasGateway({
                    apiKey: config.asaasApiKey,
                    environment: config.asaasEnvironment || 'sandbox'
                }),
                providerName: 'asaas'
            };
        }
    }

    async createCharge(params: {
        tenantId: string;
        amount: number;
        description: string;
        paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
        billingCycle?: string;
        dueDate?: string;
    }) {
        const { gateway, providerName } = await this.getGateway();

        // Buscar dados do tenant para compor o cliente
        const tenant = await this.prisma.tenant.findUnique({ where: { id: params.tenantId } });
        if (!tenant) throw new AppError('Tenant não encontrado', 404);

        const metadata = (tenant.metadata as any) || {};

        // Preparar dados do cliente
        const customerData = {
            name: tenant.name,
            email: metadata.billingEmail || 'financeiro@exemplo.com', // Fallback
            taxId: tenant.cnpj,
            phone: metadata.billingPhone,
            address: metadata.address // Assumindo que existe estrutura de endereço no metadata
        };

        // Criar cobrança no Gateway
        const chargeResponse = await gateway.createCharge({
            tenantId: params.tenantId,
            amount: params.amount,
            description: params.description,
            paymentMethod: params.paymentMethod,
            dueDate: params.dueDate,
            customer: customerData
        });

        // Persistir no banco
        const payment = await this.prisma.payment.create({
            data: {
                tenantId: params.tenantId,
                amount: params.amount,
                paymentMethod: params.paymentMethod.toLowerCase(),
                gateway: providerName,
                gatewayChargeId: chargeResponse.id,
                status: chargeResponse.status,
                dueDate: new Date(chargeResponse.dueDate),
                pixQrCodeBase64: chargeResponse.pixQrCodeBase64,
                pixQrCode: chargeResponse.pixQrCode,
                boletoUrl: chargeResponse.boletoUrl,
                metadata: {
                    billingCycle: params.billingCycle,
                    description: params.description,
                    originalResponse: chargeResponse.originalResponse
                },
            },
        });

        return { charge: chargeResponse, payment };
    }

    async syncChargeStatus(gatewayChargeId: string) {
        const payment = await this.prisma.payment.findUnique({ where: { gatewayChargeId } });
        if (!payment) throw new AppError('Cobrança não encontrada', 404);

        // Instanciar o gateway correto baseado no que está salvo no pagamento
        let gateway: PaymentGateway;
        const config = await this.globalCfg.getFullConfig();

        if (payment.gateway === 'infinitypay') {
            gateway = new InfinityPayGateway({
                apiKey: config.infinityPayApiKey || '',
                secretKey: config.infinityPayMerchantId || ''
            });
        } else {
            gateway = new AsaasGateway({
                apiKey: config.asaasApiKey || '',
                environment: config.asaasEnvironment || 'sandbox'
            });
        }

        try {
            const statusData = await gateway.getChargeStatus(gatewayChargeId);

            if (statusData.status !== payment.status) {
                const updated = await this.prisma.payment.update({
                    where: { id: payment.id },
                    data: {
                        status: statusData.status,
                        paidAt: statusData.status === 'confirmed' ? new Date() : undefined,
                        confirmedAt: statusData.status === 'confirmed' ? new Date() : undefined
                    }
                });

                // Lógica de renovação de assinatura se confirmado
                if (statusData.status === 'confirmed' && payment.status !== 'confirmed') {
                    await this.extendSubscription(payment.tenantId);
                }

                return { updated: true, payment: updated };
            }

            return { updated: false, payment };

        } catch (error) {
            console.error(`Erro ao sincronizar cobrança ${gatewayChargeId}:`, error);
            throw error;
        }
    }

    private async extendSubscription(tenantId: string) {
        const subscription = await this.prisma.subscription.findUnique({ where: { tenantId } });
        if (subscription) {
            const currentEnd = subscription.endDate;
            const baseDate = currentEnd < new Date() ? new Date() : currentEnd;
            const newEnd = new Date(baseDate);
            newEnd.setMonth(newEnd.getMonth() + 1);

            await this.prisma.subscription.update({
                where: { tenantId },
                data: { endDate: newEnd, status: 'active' },
            });

            await this.prisma.tenant.update({
                where: { id: tenantId },
                data: {
                    subscriptionEnd: newEnd,
                    subscriptionStatus: 'active',
                    status: 'active',
                },
            });
        }
    }

    async syncAllCharges() {
        // Buscar todas as cobranças locais pendentes ou vencidas
        const localPayments = await this.prisma.payment.findMany({
            where: {
                gatewayChargeId: { not: null },
                status: { in: ['pending', 'overdue'] }
            }
        });

        console.log(`[PaymentService] Syncing ${localPayments.length} charges...`);

        let synced = 0;
        let errors = 0;

        for (const payment of localPayments) {
            try {
                if (payment.gatewayChargeId) {
                    const result = await this.syncChargeStatus(payment.gatewayChargeId);
                    if (result.updated) synced++;
                }
            } catch (error) {
                console.error(`[PaymentService] Error syncing ${payment.gatewayChargeId}:`, error);
                errors++;
            }
        }

        return { synced, errors, total: localPayments.length };
    }

    async cancelCharge(gatewayChargeId: string) {
        const payment = await this.prisma.payment.findUnique({
            where: { gatewayChargeId }
        });

        if (!payment) {
            throw new AppError('Cobrança não encontrada', 404);
        }

        if (payment.status === 'confirmed') {
            throw new AppError('Não é possível cancelar uma cobrança já paga', 400);
        }

        if (payment.status === 'cancelled') {
            throw new AppError('Cobrança já está cancelada', 400);
        }

        // Instanciar o gateway correto baseado no que está salvo no pagamento
        let gateway: PaymentGateway;
        const config = await this.globalCfg.getFullConfig();

        if (payment.gateway === 'infinitypay') {
            gateway = new InfinityPayGateway({
                apiKey: config.infinityPayApiKey || '',
                secretKey: config.infinityPayMerchantId || ''
            });
        } else {
            gateway = new AsaasGateway({
                apiKey: config.asaasApiKey || '',
                environment: config.asaasEnvironment || 'sandbox'
            });
        }

        // Cancelar no gateway
        await gateway.cancelCharge(gatewayChargeId);

        // Atualizar status no banco
        const updated = await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: 'cancelled',
                updatedAt: new Date()
            }
        });

        return { success: true, payment: updated };
    }
}

