import { PrismaClient } from '@prisma/client';
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

export class AsaasService {
  private globalCfg: GlobalPaymentConfigService;

  constructor(private prisma: PrismaClient) {
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

    // Criação do cliente
    const customerPayload = {
      name: tenant.name,
      cpfCnpj: tenant.cnpj,
      email: metadata.billingEmail || 'financeiro@exemplo.com',
      phone: metadata.billingPhone || undefined,
      // Opcional: address fields se disponíveis em metadata
    };

    const created = await this.request<AsaasCustomerResponse>('/customers', {
      method: 'POST',
      body: JSON.stringify(customerPayload),
    });

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

  /** Processa webhook do Asaas */
  async processWebhook(payload: any) {
    const event = payload.event;
    const paymentId = payload.payment?.id;
    if (!event || !paymentId) {
      throw new AppError('Webhook inválido', 400);
    }

    const payment = await this.prisma.payment.findUnique({ where: { gatewayChargeId: paymentId } });
    if (!payment) {
      console.warn('[AsaasWebhook] Pagamento não encontrado localmente:', paymentId);
      return { updated: false };
    }

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
        return { updated: false };
    }

    const updatedPayment = await this.prisma.payment.update({
      where: { gatewayChargeId: paymentId },
      data: {
        status: newStatus,
        confirmedAt: newStatus === 'confirmed' ? new Date() : undefined,
        paidAt: newStatus === 'confirmed' ? new Date() : undefined,
      },
    });

    // Se confirmado, estender assinatura +1 mês
    if (newStatus === 'confirmed') {
      const subscription = await this.prisma.subscription.findUnique({ where: { tenantId: payment.tenantId } });
      if (subscription) {
        // Adicionar 1 mês à data de término
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
        return 'cancelled';
      case 'REFUNDED':
        return 'refunded';
      default:
        return 'pending';
    }
  }
}
