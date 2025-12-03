/**
 * InfinityPay Payment Service
 * Integração básica com a plataforma InfinityPay
 */

import axios from 'axios';

interface InfinityPayConfig {
  apiKey: string;
  secretKey: string;
  baseUrl?: string;
}

interface ChargeRequest {
  amount: number;
  paymentMethod: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
  description?: string;
  customerEmail?: string;
  customerId?: string;
  billingCycle?: string;
}

interface ChargeResponse {
  chargeId: string;
  status: string;
  dueDate: string;
  amount: number;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  boletoUrl?: string;
  creditCardToken?: string;
}

interface WebhookPayload {
  event: string;
  charge?: {
    id: string;
    status: string;
    amount: number;
  };
}

export class InfinityPayService {
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;

  constructor(config: InfinityPayConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.baseUrl = config.baseUrl || 'https://api.infinitypay.com/v1';
  }

  /**
   * Criar cobrança via InfinityPay
   */
  async createCharge(payload: ChargeRequest): Promise<ChargeResponse> {
    try {
      const headers = {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Secret-Key': this.secretKey,
        'Content-Type': 'application/json',
      };

      const response = await axios.post(`${this.baseUrl}/charges`, {
        amount: payload.amount,
        paymentMethod: payload.paymentMethod,
        description: payload.description || 'Cobrança de assinatura',
        customerEmail: payload.customerEmail,
        customerId: payload.customerId,
        billingCycle: payload.billingCycle,
      }, { headers });

      const charge = response.data.data;

      // Formatar resposta
      const result: ChargeResponse = {
        chargeId: charge.id,
        status: charge.status || 'PENDING',
        dueDate: charge.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: charge.amount,
      };

      // Adicionar método de pagamento específico
      if (payload.paymentMethod === 'PIX' && charge.qrCode) {
        result.pixQrCode = charge.qrCode;
        result.pixQrCodeBase64 = charge.qrCodeBase64;
      } else if (payload.paymentMethod === 'BOLETO' && charge.boletoUrl) {
        result.boletoUrl = charge.boletoUrl;
      } else if (payload.paymentMethod === 'CREDIT_CARD' && charge.token) {
        result.creditCardToken = charge.token;
      }

      return result;
    } catch (error) {
      console.error('InfinityPay createCharge error:', error);
      throw new Error(`Failed to create charge via InfinityPay: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Obter status da cobrança
   */
  async getChargeStatus(chargeId: string): Promise<{ status: string; amount: number; paidAt?: string }> {
    try {
      const headers = {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Secret-Key': this.secretKey,
      };

      const response = await axios.get(`${this.baseUrl}/charges/${chargeId}`, { headers });
      const charge = response.data.data;

      return {
        status: charge.status,
        amount: charge.amount,
        paidAt: charge.paidAt,
      };
    } catch (error) {
      console.error('InfinityPay getChargeStatus error:', error);
      throw new Error(`Failed to get charge status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Processar webhook InfinityPay
   */
  async processWebhook(payload: WebhookPayload): Promise<{ processed: boolean; message: string }> {
    try {
      console.log('InfinityPay webhook received:', payload.event);

      // Validar token do webhook (pode ser adicionado depois)
      // if (!this.validateWebhookToken(payload)) {
      //   return { processed: false, message: 'Invalid webhook token' };
      // }

      // Processar eventos específicos
      switch (payload.event) {
        case 'CHARGE_PAID':
        case 'PAYMENT_CONFIRMED':
          console.log(`Charge ${payload.charge?.id} marked as paid`);
          return { processed: true, message: 'Payment confirmed' };

        case 'CHARGE_EXPIRED':
        case 'PAYMENT_FAILED':
          console.log(`Charge ${payload.charge?.id} expired or failed`);
          return { processed: true, message: 'Payment failed' };

        default:
          console.log(`Unknown event: ${payload.event}`);
          return { processed: true, message: 'Event logged' };
      }
    } catch (error) {
      console.error('InfinityPay webhook processing error:', error);
      throw new Error(`Failed to process webhook: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refundar cobrança (stub)
   */
  async refundCharge(chargeId: string, amount?: number): Promise<{ refundId: string; status: string }> {
    try {
      const headers = {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-Secret-Key': this.secretKey,
        'Content-Type': 'application/json',
      };

      const response = await axios.post(`${this.baseUrl}/charges/${chargeId}/refund`, {
        amount: amount,
      }, { headers });

      return {
        refundId: response.data.data.refundId,
        status: response.data.data.status,
      };
    } catch (error) {
      console.error('InfinityPay refundCharge error:', error);
      throw new Error(`Failed to refund charge: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default InfinityPayService;
