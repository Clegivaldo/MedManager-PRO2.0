import pkg from '@prisma/client';
import type { PrismaClient as PrismaClientType } from '@prisma/client';
const PrismaClientRuntime = (pkg as any).PrismaClient as any;
import { AppError } from '../../utils/errors.js';
import { GlobalPaymentConfigService } from './globalPaymentConfig.service.js';

interface CreateChargeParams {
  tenantId: string;
  amount: number;
  description: string;
  billingCycle?: 'monthly' | 'annual';
  paymentMethod: 'PIX' | 'BOLETO';
  dueDate?: string; // YYYY-MM-DD
}

interface AsaasCustomerResponse {
  id: string;
  name: string;
  email?: string;
  cpfCnpj?: string;
}

interface AsaasChargeResponse {
  id: string;
  customer: string;
  value: number;
  dueDate: string;
  invoiceNumber?: string;
  status: string;
  paymentLink?: string;
  bankSlipUrl?: string;
  pixQrCode?: {
    encodedImage: string;
    payload: string;
    expirationDate: string;
  };
  billingType: string; // PIX, BOLETO
  createdAt?: string;
}

/**
 * Formata CNPJ para o padrão XX.XXX.XXX/XXXX-XX
 */
function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return cleaned; // Retorna como está se não tem 14 dígitos
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

export class AsaasService {
  private globalCfg: GlobalPaymentConfigService;

  constructor(private prisma: PrismaClientType) {
    this.globalCfg = new GlobalPaymentConfigService(prisma);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cfg = await this.globalCfg.getAsaasConfig();
    const apiKey = cfg.apiKey;
    const env = cfg.environment || 'sandbox';

    if (!apiKey) {
      throw new AppError('Gateway Asaas não configurado', 500, 'ASAAS_NOT_CONFIGURED');
    }

    const baseUrl = env === 'production' ? 'https://www.asaas.com/api/v3' : 'https://sandbox.asaas.com/api/v3';
    const url = `${baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'access_token': apiKey,
        ...(options.headers || {}),
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new AppError(`Erro Asaas (${response.status}): ${body}`, response.status);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Cria ou retorna o customerId do Asaas para o tenant
   */
  async ensureCustomer(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new AppError('Tenant não encontrado', 404);

    const metadata = (tenant.metadata as any) || {};
    if (metadata.asaasCustomerId) {
      return metadata.asaasCustomerId;
    }

    // Criação do cliente com CNPJ
    const customerPayload = {
      name: tenant.name,
      cpfCnpj: tenant.cnpj, // Enviar sem formatação (apenas números)
      email: metadata.billingEmail || 'financeiro@exemplo.com',
      phone: metadata.billingPhone || undefined,
      // Opcional: address fields se disponíveis em metadata
    };

    console.log('[AsaasService] Creating customer:', customerPayload);

    const created = await this.request<AsaasCustomerResponse>('/customers', {
      method: 'POST',
      body: JSON.stringify(customerPayload),
    });

    console.log('[AsaasService] Customer created:', created.id);

    // Persistir no metadata
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { metadata: { ...metadata, asaasCustomerId: created.id } },
    });

    return created.id;
  }

  /**
   * Cria uma cobrança (PIX ou BOLETO)
   */
  async createCharge(params: CreateChargeParams) {
    const { tenantId, amount, description, paymentMethod, billingCycle = 'monthly', dueDate } = params;
    const customerId = await this.ensureCustomer(tenantId);

    const today = new Date();
    const defaultDue = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000); // +3 dias
    const dueDateStr = dueDate || defaultDue.toISOString().split('T')[0];

    const payload = {
      customer: customerId,
      value: amount,
      dueDate: dueDateStr,
      description,
      billingType: paymentMethod, // "PIX" ou "BOLETO"
      externalReference: `${tenantId}-${Date.now()}`,
    };

    const charge = await this.request<AsaasChargeResponse>('/payments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    // Persistir pagamento local
    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        amount,
        paymentMethod: paymentMethod.toLowerCase(),
        gateway: 'asaas',
        gatewayChargeId: charge.id,
        status: this.mapStatus(charge.status),
        dueDate: new Date(charge.dueDate),
        pixQrCodeBase64: charge.pixQrCode?.encodedImage,
        pixQrCode: charge.pixQrCode?.payload,
        boletoUrl: charge.bankSlipUrl,
        metadata: {
          billingCycle,
          description,
        },
      },
    });

    return { charge, payment };
  }

  /** Consulta status da cobrança */
  async getChargeStatus(gatewayChargeId: string) {
    const charge = await this.request<AsaasChargeResponse>(`/payments/${gatewayChargeId}`);
    return {
      id: charge.id,
      status: this.mapStatus(charge.status),
      originalStatus: charge.status,
      dueDate: charge.dueDate,
      bankSlipUrl: charge.bankSlipUrl,
      pixQrCode: charge.pixQrCode?.payload,
    };
  }

  /** Cancela cobrança no Asaas */
  async cancelCharge(gatewayChargeId: string) {
    const charge = await this.request<AsaasChargeResponse>(`/payments/${gatewayChargeId}`, { method: 'DELETE' });
    return charge;
  }

  /** Lista todas as cobranças do Asaas */
  async listAllCharges(params?: { offset?: number; limit?: number; customer?: string }) {
    const query = new URLSearchParams();
    if (params?.offset) query.append('offset', String(params.offset));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.customer) query.append('customer', params.customer);

    const response = await this.request<{ data: AsaasChargeResponse[]; hasMore: boolean; totalCount: number }>(`/payments?${query.toString()}`);
    return response;
  }

  /** Sincroniza todas as cobranças locais com o Asaas */
  async syncAllCharges() {
    // Buscar todas as cobranças do Asaas
    const { data: asaasCharges } = await this.listAllCharges({ limit: 100 });
    const asaasChargeIds = new Set(asaasCharges.map(c => c.id));

    console.log(`[AsaasSyncAll] Cobranças encontradas no Asaas: ${asaasCharges.length}`);
    console.log(`[AsaasSyncAll] IDs: ${Array.from(asaasChargeIds).join(', ')}`);

    // Buscar todas as cobranças locais
    const localPayments = await this.prisma.payment.findMany({
      where: {
        gateway: 'asaas',
        gatewayChargeId: { not: null },
        status: { not: 'cancelled' } // Não processar as já canceladas
      }
    });

    console.log(`[AsaasSyncAll] Cobranças locais (não canceladas): ${localPayments.length}`);

    let synced = 0;
    let deleted = 0;
    let errors = 0;

    for (const payment of localPayments) {
      try {
        // Se a cobrança não existe mais na lista do Asaas, marcar como cancelada
        if (!asaasChargeIds.has(payment.gatewayChargeId!)) {
          console.log(`[AsaasSyncAll] Cobrança ${payment.gatewayChargeId} não encontrada no Asaas, marcando como cancelada`);
          
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'cancelled' }
          });
          
          deleted++;
        } else {
          // Sincronizar status normalmente
          const result = await this.syncChargeStatus(payment.gatewayChargeId!);
          if (result.updated) {
            synced++;
          }
        }
      } catch (error) {
        console.error(`[AsaasSyncAll] Erro ao sincronizar ${payment.gatewayChargeId}:`, error);
        errors++;
      }
    }

    return { synced, deleted, errors, total: localPayments.length };
  }

  /** Sincroniza status de uma cobrança com o Asaas */
  async syncChargeStatus(gatewayChargeId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { gatewayChargeId } });
    if (!payment) {
      throw new AppError('Cobrança não encontrada', 404);
    }

    // Buscar status atual no Asaas
    let charge: AsaasChargeResponse | null = null;
    let newStatus: string;
    
    try {
      charge = await this.request<AsaasChargeResponse>(`/payments/${gatewayChargeId}`);
      console.log(`[AsaasSync] Status retornado do Asaas para ${gatewayChargeId}: ${charge.status}`);
      newStatus = this.mapStatus(charge.status);
    } catch (error: any) {
      // Se retornar 404, a cobrança foi deletada no Asaas
      if (error.statusCode === 404 || error.message?.includes('404')) {
        console.log(`[AsaasSync] Cobrança ${gatewayChargeId} foi deletada no Asaas (404), marcando como cancelada`);
        newStatus = 'cancelled';
      } else {
        throw error;
      }
    }

    // Se o status mudou, atualizar no banco
    if (newStatus !== payment.status) {
      const updated = await this.prisma.payment.update({
        where: { gatewayChargeId },
        data: {
          status: newStatus,
          confirmedAt: newStatus === 'confirmed' ? new Date() : undefined,
          paidAt: newStatus === 'confirmed' ? new Date() : undefined,
        },
        include: { tenant: true },
      });

      // Se confirmado, estender assinatura
      if (newStatus === 'confirmed') {
        const subscription = await this.prisma.subscription.findUnique({
          where: { tenantId: payment.tenantId },
        });
        if (subscription) {
          const currentEnd = subscription.endDate;
          const baseDate = currentEnd < new Date() ? new Date() : currentEnd;
          const newEnd = new Date(baseDate);
          newEnd.setMonth(newEnd.getMonth() + 1);

          await this.prisma.subscription.update({
            where: { tenantId: payment.tenantId },
            data: { endDate: newEnd, status: 'active' },
          });

          await this.prisma.tenant.update({
            where: { id: payment.tenantId },
            data: {
              subscriptionEnd: newEnd,
              subscriptionStatus: 'active',
              status: 'active',
            },
          });
        }
      }

      console.log(`[AsaasSync] Cobrança ${gatewayChargeId} sincronizada: ${payment.status} → ${newStatus}`);
      return { updated: true, payment: updated, previousStatus: payment.status, newStatus };
    }

    console.log(`[AsaasSync] Cobrança ${gatewayChargeId} já está em ${newStatus}`);
    return { updated: false, payment, status: newStatus };
  }

  /** Processa webhook do Asaas */
  async processWebhook(payload: any) {
    const event = payload.event;
    const paymentId = payload.payment?.id;
    
    console.log(`[AsaasWebhook] Processing webhook - Event: ${event}, PaymentId: ${paymentId}`);
    
    if (!event || !paymentId) {
      console.error('[AsaasWebhook] Invalid webhook: missing event or paymentId');
      throw new AppError('Webhook inválido', 400);
    }

    const payment = await this.prisma.payment.findUnique({ where: { gatewayChargeId: paymentId } });
    if (!payment) {
      console.warn('[AsaasWebhook] Pagamento não encontrado localmente:', paymentId);
      return { updated: false, message: 'Payment not found locally' };
    }

    console.log(`[AsaasWebhook] Payment found: id=${payment.id}, currentStatus=${payment.status}`);

    let newStatus: string | undefined;

    switch (event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        newStatus = 'confirmed';
        break;
      case 'PAYMENT_OVERDUE':
        newStatus = 'overdue';
        break;
      case 'PAYMENT_DELETED':
        newStatus = 'cancelled';
        break;
      case 'PAYMENT_REFUNDED':
        newStatus = 'refunded';
        break;
      default:
        console.log('[AsaasWebhook] Evento ignorado:', event);
        return { updated: false, message: `Event ${event} ignored` };
    }

    console.log(`[AsaasWebhook] Updating payment status: ${payment.status} → ${newStatus}`);

    const updatedPayment = await this.prisma.payment.update({
      where: { gatewayChargeId: paymentId },
      data: {
        status: newStatus,
        confirmedAt: newStatus === 'confirmed' ? new Date() : undefined,
        paidAt: newStatus === 'confirmed' ? new Date() : undefined,
      },
      include: { tenant: true }
    });

    // Se confirmado, estender assinatura +1 mês
    if (newStatus === 'confirmed') {
      console.log(`[AsaasWebhook] Extending subscription for tenant: ${payment.tenantId}`);
      
      const subscription = await this.prisma.subscription.findUnique({ where: { tenantId: payment.tenantId } });
      if (subscription) {
        // Adicionar 1 mês à data de término
        const currentEnd = subscription.endDate;
        const baseDate = currentEnd < new Date() ? new Date() : currentEnd;
        const newEnd = new Date(baseDate);
        newEnd.setMonth(newEnd.getMonth() + 1);

        console.log(`[AsaasWebhook] Extending subscription: ${currentEnd} → ${newEnd}`);

        await this.prisma.subscription.update({
          where: { tenantId: payment.tenantId },
          data: { endDate: newEnd, status: 'active' },
        });

        await this.prisma.tenant.update({
          where: { id: payment.tenantId },
          data: {
            subscriptionEnd: newEnd,
            subscriptionStatus: 'active',
            status: 'active',
          },
        });
        
        console.log(`[AsaasWebhook] Subscription extended successfully`);
      } else {
        console.warn(`[AsaasWebhook] No subscription found for tenant: ${payment.tenantId}`);
      }
    }

    console.log(`[AsaasWebhook] Webhook processed successfully: ${paymentId}`);
    return { updated: true, payment: updatedPayment };
  }

  /** Mapeia status do Asaas para status interno */
  private mapStatus(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'pending';
      case 'RECEIVED':
      case 'CONFIRMED':
        return 'confirmed';
      case 'OVERDUE':
        return 'overdue';
      case 'CANCELLED':
      case 'DELETED':
        return 'cancelled';
      case 'REFUNDED':
        return 'refunded';
      default:
        console.warn(`[AsaasService] Status desconhecido do Asaas: ${status}`);
        return 'pending';
    }
  }
}
