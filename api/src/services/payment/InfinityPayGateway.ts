/**
 * InfinityPay Gateway Integration
 * 
 * ⚠️ ATENÇÃO: Esta implementação usa estruturas HIPOTÉTICAS da API InfinityPay.
 * 
 * ANTES DE USAR EM PRODUÇÃO:
 * 1. Obter documentação oficial da API InfinityPay
 * 2. Validar base URL: https://api.infinitypay.com/v1 (pode estar incorreta)
 * 3. Validar estrutura de autenticação (Bearer token + X-Secret-Key)
 * 4. Validar estrutura de payload para criação de cobranças
 * 5. Validar mapeamento de status (PENDING, PAID, CONFIRMED, etc)
 * 6. Validar estrutura de resposta (payment_link, pix_qrcode, etc)
 * 7. Testar em ambiente de sandbox/homologação
 * 
 * DOCUMENTAÇÃO NECESSÁRIA:
 * - URL da API (sandbox e produção)
 * - Método de autenticação
 * - Endpoints disponíveis
 * - Estrutura de request/response
 * - Códigos de status
 * - Webhooks (formato e autenticação)
 * 
 * CONTATO: Solicitar acesso à documentação oficial da InfinityPay
 */
import { PaymentGateway, CreateChargeParams, ChargeResponse, PaymentStatus } from './PaymentGateway.interface.js';
import axios from 'axios';


interface InfinityPayConfig {
    apiKey: string;
    secretKey: string; // Usado como Merchant ID ou Client Secret dependendo da doc real
    baseUrl?: string;
}

export class InfinityPayGateway implements PaymentGateway {
    private baseUrl: string;

    constructor(private config: InfinityPayConfig) {
        this.baseUrl = config.baseUrl || 'https://api.infinitypay.com/v1'; // URL hipotética, ajustar quando tiver doc real
    }

    private getHeaders() {
        return {
            'Authorization': `Bearer ${this.config.apiKey}`,
            'X-Secret-Key': this.config.secretKey,
            'Content-Type': 'application/json',
        };
    }

    private mapStatus(status: string): PaymentStatus {
        // Mapeamento hipotético - ajustar conforme resposta real da API
        switch (status?.toUpperCase()) {
            case 'PENDING': return 'pending';
            case 'PAID':
            case 'CONFIRMED': return 'confirmed';
            case 'EXPIRED': return 'overdue'; // ou failed
            case 'CANCELED': return 'cancelled';
            case 'REFUNDED': return 'refunded';
            default: return 'pending';
        }
    }

    async createCharge(params: CreateChargeParams): Promise<ChargeResponse> {
        try {
            // InfinityPay geralmente foca em maquininha, mas assumindo API de e-commerce/link
            const payload = {
                amount: Math.round(params.amount * 100), // Centavos
                payment_method: params.paymentMethod.toLowerCase(),
                description: params.description,
                customer: {
                    name: params.customer.name,
                    email: params.customer.email,
                    document: params.customer.taxId,
                    phone: params.customer.phone
                },
                metadata: {
                    tenantId: params.tenantId
                }
            };

            const response = await axios.post(`${this.baseUrl}/charges`, payload, {
                headers: this.getHeaders()
            });

            const data = response.data;

            return {
                id: data.id,
                status: this.mapStatus(data.status),
                value: params.amount,
                dueDate: params.dueDate || new Date().toISOString(),
                paymentLink: data.payment_link,
                pixQrCode: data.pix_qrcode,
                pixQrCodeBase64: data.pix_qrcode_base64,
                originalResponse: data
            };

        } catch (error: any) {
            console.error('InfinityPay createCharge error:', error.response?.data || error.message);
            throw new Error(`InfinityPay Error: ${error.response?.data?.message || error.message}`);
        }
    }

    async getChargeStatus(chargeId: string): Promise<ChargeResponse> {
        try {
            const response = await axios.get(`${this.baseUrl}/charges/${chargeId}`, {
                headers: this.getHeaders()
            });
            const data = response.data;

            return {
                id: data.id,
                status: this.mapStatus(data.status),
                value: data.amount / 100,
                dueDate: data.due_date,
                originalResponse: data
            };
        } catch (error: any) {
            throw new Error(`InfinityPay Error: ${error.response?.data?.message || error.message}`);
        }
    }

    async cancelCharge(chargeId: string): Promise<void> {
        try {
            await axios.delete(`${this.baseUrl}/charges/${chargeId}`, {
                headers: this.getHeaders()
            });
        } catch (error: any) {
            throw new Error(`InfinityPay Error: ${error.response?.data?.message || error.message}`);
        }
    }
}
